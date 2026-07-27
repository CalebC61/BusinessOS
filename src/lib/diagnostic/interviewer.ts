import { getAnthropicClient, DIAGNOSTIC_INTERVIEWER_MODEL } from "@/lib/anthropic/client";
import {
  getNode,
  MODULE_LABELS,
  type ConstraintModule,
  type TreeNode,
} from "./tree";
import {
  validateInterviewerOutput,
  type DiagnosticInterviewerOutput,
  type HypothesisRanking,
} from "./validate";

export type HistoryTurn = { question: string; answer: string };

export type IntakeRecord = {
  business_model?: string;
  offer?: string;
  pricing?: Record<string, unknown>;
  ttm_revenue?: number;
  lead_sources?: string[];
  hours_breakdown?: Record<string, unknown>;
  what_tried?: string;
};

/** Injectable so the branch-selection/validation/fallback logic can be exercised without a live API key. */
export type ModelCaller = (systemPrompt: string, userPrompt: string) => Promise<string>;

const defaultCaller: ModelCaller = async (systemPrompt, userPrompt) => {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: DIAGNOSTIC_INTERVIEWER_MODEL,
    max_tokens: 1024,
    temperature: 0.2, // AGENTS.md Role 1: temperature <= 0.2
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Diagnostic interviewer returned no text content");
  }
  return block.text;
};

type RawModelOutput = {
  chosen_next_node_id: string | null;
  module_confidences?: { module: string; confidence: number }[];
  rock_proposal?: string | null;
  extracted?: Record<string, unknown>;
};

function buildSystemPrompt(node: TreeNode): string {
  const allowedNextIds = node.branches.map((b) => b.next_node_id ?? "null");
  return `You are the Operator Diagnostic interviewer (AGENTS.md Role 1). You select and classify — you never author questions or invent constraint modules.

The user was just asked (verbatim, fixed text you must not repeat or rephrase):
"${node.question}"

They answered in free text. Your job, given their answer and the conversation so far:

1. Classify which of the CURRENT node's fixed branches their answer matches, and return that branch's next_node_id. You may ONLY return one of these exact values: ${allowedNextIds.join(", ")}. The literal string "null" means the diagnostic branch that has next_node_id: null — use JSON null for that, not the string "null".
2. Extract any of these business-intake fields evident in their answer (omit fields not evident, never invent values): business_model, offer, pricing (object), ttm_revenue (number), lead_sources (string array), hours_breakdown (object), what_tried (string).
3. ONLY if you chose a branch whose next_node_id is null (a terminal branch): also return module_confidences — a confidence 0-1 for each module in this fixed allowed list: ${node.module_candidates.join(", ")} (never a module outside this list) — and rock_proposal, one specific, difficult 90-day rock statement synthesized from the whole conversation for the highest-confidence module (per content/protocols/07-goal-setting-rock.md — no vague goals like "grow the business").

Output ONLY this JSON object, no markdown fences, no prose:
{
  "chosen_next_node_id": string | null,
  "extracted": { ...only the fields you found... },
  "module_confidences": [{ "module": string, "confidence": number }] | omit if not terminal,
  "rock_proposal": string | omit if not terminal
}`;
}

function buildUserPrompt(history: HistoryTurn[], latestAnswer: string): string {
  const transcript = history
    .map((turn, i) => `Q${i + 1}: ${turn.question}\nA${i + 1}: ${turn.answer}`)
    .join("\n\n");
  return `${transcript ? `Conversation so far:\n${transcript}\n\n` : ""}Latest answer: ${latestAnswer}`;
}

function parseRawOutput(text: string): RawModelOutput | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== "object" || parsed === null || !("chosen_next_node_id" in parsed)) {
      return null;
    }
    return parsed as RawModelOutput;
  } catch {
    return null;
  }
}

function isValidRaw(raw: RawModelOutput, node: TreeNode): boolean {
  const allowedIds = new Set(node.branches.map((b) => b.next_node_id));
  if (!allowedIds.has(raw.chosen_next_node_id)) return false;

  const terminal = raw.chosen_next_node_id === null;
  if (terminal) {
    if (!Array.isArray(raw.module_confidences) || raw.module_confidences.length === 0) {
      return false;
    }
    const allowedModules = new Set(node.module_candidates);
    for (const mc of raw.module_confidences) {
      if (!allowedModules.has(mc.module as ConstraintModule)) return false;
      if (typeof mc.confidence !== "number" || mc.confidence < 0 || mc.confidence > 1) return false;
    }
    if (typeof raw.rock_proposal !== "string" || raw.rock_proposal.trim().length === 0) {
      return false;
    }
  }
  return true;
}

function deterministicFallback(node: TreeNode): RawModelOutput {
  const fallbackBranch = node.branches[0];
  const terminal = fallbackBranch.next_node_id === null;
  if (!terminal) {
    return { chosen_next_node_id: fallbackBranch.next_node_id, extracted: {} };
  }
  const equalConfidence = 1 / node.module_candidates.length;
  const topModule = node.module_candidates[0];
  return {
    chosen_next_node_id: null,
    extracted: {},
    module_confidences: node.module_candidates.map((module) => ({
      module,
      confidence: equalConfidence,
    })),
    rock_proposal: `In the next 90 days, focus every available hour on ${MODULE_LABELS[topModule]}.`,
  };
}

export type TurnInput = {
  currentNodeId: string;
  latestAnswer: string;
  history: HistoryTurn[];
  priorIntakeRecord: IntakeRecord;
};

export async function runDiagnosticTurn(
  input: TurnInput,
  caller: ModelCaller = defaultCaller,
): Promise<DiagnosticInterviewerOutput> {
  const node = getNode(input.currentNodeId);
  if (!node) {
    throw new Error(`Unknown diagnostic tree node: ${input.currentNodeId}`);
  }

  const systemPrompt = buildSystemPrompt(node);
  const userPrompt = buildUserPrompt(input.history, input.latestAnswer);

  let raw = parseRawOutput(await caller(systemPrompt, userPrompt));
  if (!raw || !isValidRaw(raw, node)) {
    // AGENTS.md cross-cutting rule: retry once, then fall back to a deterministic default.
    const retryPrompt = `${userPrompt}\n\n(Your previous response did not match the required JSON contract. Re-read the rules and try again — output only the JSON object.)`;
    raw = parseRawOutput(await caller(systemPrompt, retryPrompt));
    if (!raw || !isValidRaw(raw, node)) {
      raw = deterministicFallback(node);
    }
  }

  const terminal = raw.chosen_next_node_id === null;
  const mergedIntakeRecord: IntakeRecord = { ...input.priorIntakeRecord, ...raw.extracted };

  const hypothesis_ranking: HypothesisRanking = terminal
    ? (raw.module_confidences ?? []).map((mc) => ({
        module: mc.module as ConstraintModule,
        confidence: mc.confidence,
      }))
    : [];

  const output: DiagnosticInterviewerOutput = {
    tree_node_id: terminal ? node.node_id : raw.chosen_next_node_id!,
    next_question: terminal ? null : (getNode(raw.chosen_next_node_id!)?.question ?? null),
    hypothesis_ranking,
    intake_record: mergedIntakeRecord,
    rock_proposal: terminal ? (raw.rock_proposal ?? null) : null,
  };

  const validated = validateInterviewerOutput(output);
  if (!validated.valid) {
    // Should be unreachable — output is assembled from trusted fixed data plus a
    // pre-validated raw payload. If it ever fires, that's a contract bug to fix, not
    // something to paper over with another retry.
    throw new Error(`Assembled diagnostic output failed contract validation: ${validated.errors}`);
  }

  return validated.data;
}
