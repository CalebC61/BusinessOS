import Ajv, { type ValidateFunction } from "ajv";
import schema from "@contracts/diagnostic-intake.schema.json";
import type { ConstraintModule } from "./tree";

export type HypothesisRanking = { module: ConstraintModule; confidence: number }[];

export type DiagnosticInterviewerOutput = {
  next_question: string | null;
  tree_node_id: string;
  hypothesis_ranking: HypothesisRanking;
  intake_record?: Record<string, unknown>;
  rock_proposal?: string | null;
};

const ajv = new Ajv({ allErrors: true, strict: false });
let validateFn: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  validateFn ??= ajv.compile(schema);
  return validateFn;
}

export type ValidationResult =
  | { valid: true; data: DiagnosticInterviewerOutput }
  | { valid: false; errors: string };

/** Validates raw model output against contracts/diagnostic-intake.schema.json before it's trusted anywhere downstream. */
export function validateInterviewerOutput(raw: unknown): ValidationResult {
  const validate = getValidator();
  if (validate(raw)) {
    return { valid: true, data: raw as DiagnosticInterviewerOutput };
  }
  const errors = ajv.errorsText(validate.errors, { separator: "; " });
  return { valid: false, errors };
}
