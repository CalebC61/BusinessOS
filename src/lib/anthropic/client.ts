import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | undefined;

/** Lazily constructed so routes that don't need it (and tests that inject a fake caller) never require ANTHROPIC_API_KEY. */
export function getAnthropicClient(): Anthropic {
  client ??= new Anthropic({ apiKey: requireApiKey() });
  return client;
}

function requireApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. See .env.example — every AGENTS.md LLM role needs it.",
    );
  }
  return key;
}

export const DIAGNOSTIC_INTERVIEWER_MODEL = "claude-sonnet-5";
