import { getScaleDefinition, type Instrument, type ScaleDefinition } from "./definitions";

export type ScoreResult = {
  score: number;
  floor_policy_triggered: boolean;
};

/** WHO-5 percentage score below this triggers the supportive-resources message (PRD §16 risk 5). Not a clinical cutoff — a product threshold, tunable, never framed as diagnostic. */
export const WHO5_FLOOR_THRESHOLD = 50;

function reverseValue(value: number, def: ScaleDefinition): number {
  const values = def.response_scale.map((o) => o.value);
  return Math.min(...values) + Math.max(...values) - value;
}

function applyReversals(responses: number[], def: ScaleDefinition): number[] {
  return responses.map((v, i) =>
    def.reverse_scored_indices.includes(i) ? reverseValue(v, def) : v,
  );
}

function validateResponses(responses: number[], def: ScaleDefinition): void {
  if (responses.length !== def.items.length) {
    throw new Error(
      `${def.instrument} expects ${def.items.length} responses, got ${responses.length}`,
    );
  }
  const allowed = new Set(def.response_scale.map((o) => o.value));
  for (const r of responses) {
    if (!allowed.has(r)) {
      throw new Error(`${def.instrument} response ${r} is outside the allowed scale`);
    }
  }
}

function scoreWHO5(responses: number[]): ScoreResult {
  const def = getScaleDefinition("who5");
  validateResponses(responses, def);
  const rawSum = responses.reduce((a, b) => a + b, 0);
  const percentage = rawSum * 4; // published WHO-5 scoring: raw (0-25) x 4 = 0-100
  return {
    score: percentage,
    floor_policy_triggered: percentage < WHO5_FLOOR_THRESHOLD,
  };
}

function scoreNGSE(responses: number[]): ScoreResult {
  const def = getScaleDefinition("ngse");
  validateResponses(responses, def);
  const adjusted = applyReversals(responses, def);
  const mean = adjusted.reduce((a, b) => a + b, 0) / adjusted.length;
  return { score: mean, floor_policy_triggered: false };
}

function scoreIPS(responses: number[]): ScoreResult {
  const def = getScaleDefinition("ips");
  validateResponses(responses, def);
  const adjusted = applyReversals(responses, def);
  const mean = adjusted.reduce((a, b) => a + b, 0) / adjusted.length;
  return { score: mean, floor_policy_triggered: false };
}

/** Deterministic scoring per instrument's published method — never touched by a model (BLUEPRINT.md §2). */
export function scoreInstrument(instrument: Instrument, responses: number[]): ScoreResult {
  switch (instrument) {
    case "who5":
      return scoreWHO5(responses);
    case "ngse":
      return scoreNGSE(responses);
    case "ips":
      return scoreIPS(responses);
  }
}
