# AGENTS — Operator, Phase 1

Full spec for every point where a model touches the product. Read `BLUEPRINT.md` §2 first — the rule that governs this whole file is: **the LLM selects and slot-fills; it never authors.** Every role below is grounded in a fixed source, produces structured output, and has an explicit refusal/fallback path. Low temperature throughout. An eval suite for protocol fidelity runs before any cohort exposure (PRD §11).

Referenced JSON schemas live in `contracts/`.

---

## Role 0 — Crisis classifier (not an LLM role)

Not listed in the PRD's LLM table on purpose: it is deterministic code, and it runs on *every* free-text input in the product before any of the five roles below ever see that text.

- **Input:** raw free-text from any surface (diagnostic answers, skip-log thought selection, coaching chat).
- **Logic:** fixed classifier (keyword/pattern + lightweight model *used only as a binary detector, output never shown to user or fed to a coaching role*) for self-harm/suicide signal.
- **On positive signal:** deterministic interstitial — 988 Suicide & Crisis Lifeline (call/text 988), encouragement to contact a professional or trusted person, coaching session pauses. No LLM coaching role is invoked for that turn.
- **Why it's not an LLM role:** if this were model judgment, a hallucination here is the single worst failure mode in the product. It is code, tested like code, and it gates every role below.

---

## Role 1 — Diagnostic interviewer

| | |
|---|---|
| **Purpose** | Conducts the branching business intake (PRD §8.1) and locates the constraint per the §7 canon map. |
| **Grounding** | Fixed decision tree (`contracts/diagnostic-tree.schema.json`) + intake schema (`contracts/diagnostic-intake.schema.json`). |
| **Input** | Conversation history + current tree node + user's latest answer. |
| **Output schema** | `{ next_question: string, tree_node_id: string, hypothesis_ranking: [{module: string, confidence: number}] }` — structured, validated against schema before it reaches the UI. |
| **Hallucination control** | Can only ask tree-sanctioned questions (`next_question` must map to a question bank entry keyed by `tree_node_id`); can only rank the 7 fixed §7 modules, never invent an 8th. Structured output rejected and retried if it fails schema validation. |
| **Model / temp** | Claude, temperature ≤ 0.2. |

## Role 2 — Directive personalizer

| | |
|---|---|
| **Purpose** | Turns the day's protocol card + user state into a concrete if-then directive (PRD §8.2). |
| **Grounding** | Protocol Library card (`content/protocols/*.md`) slot definitions + user state (rock, value, streak, recent skip history). |
| **Input** | Selected protocol card id + slot values available from user state. |
| **Output schema** | `{ if_then_plan: string, value_link: string, rock_link: uuid, verification_spec: object }` (`contracts/directive.schema.json`). |
| **Hallucination control** | Card *text* is fixed; the model fills declared slots only (e.g. `{{cue}}`, `{{action}}`, `{{time}}`). It cannot alter the card's structure, add steps, or change the verification spec's artifact type. |
| **Model / temp** | Claude, temperature ≤ 0.3. |

## Role 3 — Coaching chat

| | |
|---|---|
| **Purpose** | Ad-hoc support: answers questions, delivers Resistance Triage micro-protocols, general encouragement. |
| **Grounding** | RAG over the Protocol Library (`content/`) + the user's own stored data (their directives, VACR, scorecard). |
| **Input** | User free-text (post-crisis-classifier) + retrieved library/user context. |
| **Output schema** | `{ response: string, citation: string | null, declined: boolean, decline_reason: string | null }`. |
| **Hallucination control** | System rule: answer only from retrieved library/user data; if the question falls outside that (medical, medication, legal, clinical-mental-health advice, or anything with no library citation available) → `declined: true` with a stated reason, never a best-guess answer. Citation is required on every non-declined response. |
| **Model / temp** | Claude, temperature ≤ 0.4. |

## Role 4 — Verification judge

| | |
|---|---|
| **Purpose** | Two-pass check of a proof artifact against its directive's verification spec (PRD §9). |
| **Grounding** | The uploaded artifact + the directive's `verification_spec` rubric. |
| **Input** | Artifact (image/document) + rubric checklist. |
| **Output schema** | Pass 1 — `{ extraction: object }` (what the artifact actually shows, vision). Pass 2 — `{ rubric_result: [{item: string, met: boolean}], confidence: number }`. |
| **Hallucination control** | Extraction and rubric-checking are separate calls — the model can't rationalize a pass by skipping straight to a verdict. Deterministic code applies the confidence threshold: below it, status is forced to `attested` regardless of what the model concluded. The model never sets `verified` directly — it proposes; code decides. |
| **Model / temp** | Claude (vision), temperature ≤ 0.1. |

## Role 5 — Sunday Review writer

| | |
|---|---|
| **Purpose** | Narrates the weekly review (PRD §8.3) and runs the WOOP session for next week's lead actions. |
| **Grounding** | Pre-computed deterministic values only: profit pulse (Xero), VACR trend, streak, rotating micro-check score. |
| **Input** | `{ profit_pulse, vacr_trend, streak, micro_check }` — all already computed by `det` jobs. |
| **Output schema** | `{ pattern_insight: string, woop_output: {wish, outcome, obstacle, plan}, next_lead_actions: string[] } ` (`contracts/sunday-review.schema.json`). |
| **Hallucination control** | The role narrates numbers it is handed — it never computes a number itself. `pattern_insight` must reference only fields present in the input payload (enforced by prompt + output validation: any numeric claim not traceable to an input field fails validation and triggers a retry). |
| **Model / temp** | Claude, temperature ≤ 0.3. |

---

## Cross-cutting rules

- Every role above validates its structured output against the matching `contracts/*.schema.json` file before the result is written to any table in `BLUEPRINT.md` §4. A schema-invalid response is retried once, then falls back to a deterministic default (e.g. Directive personalizer falls back to the card's default slot values verbatim).
- No role has write access to anything outside its own output fields — none of the five can, for example, alter `vacr_snapshot` or `profit_baseline` directly. Only `det` jobs write scoring and money tables.
- Scope refusals (medical, medication, legal, clinical-mental-health) are handled identically wherever they can occur (chiefly Role 3): decline, state why, never a soft workaround.
