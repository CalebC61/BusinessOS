# MILESTONES — Operator, Phase 1

Build order for the thin product (PRD §17 Phase 1: gated behind the §10.4 Patient Zero pass and the CalibrationOS launch blockers clearing). Each milestone lists its PRD section, what ships, the tables/roles/content it depends on, and its exit criteria. Sequenced so each milestone is demoable on its own before the next starts.

---

### M0 — Scaffold
**PRD ref:** §12 (stack)
**Ships:** Next.js app shell, Supabase project + auth, base schema migration for all tables in `BLUEPRINT.md` §4, CI, environment config for Xero/Claude API keys.
**Depends on:** nothing.
**Exit criteria:** a logged-in user can hit an empty dashboard; all Phase 1 tables exist and are empty.

### M1 — Onboarding diagnostic
**PRD ref:** §8.1, §7
**Ships:** Business intake flow calling the Diagnostic interviewer (`AGENTS.md` Role 1), fixed decision tree data, the Operator Scorecard output view.
**Depends on:** M0 schema; `contracts/diagnostic-intake.schema.json`, `contracts/diagnostic-tree.schema.json`; `content/canon-routing/*.md` for the 7 constraint modules.
**Exit criteria:** a user completes the intake and receives a named constraint + a proposed 90-day rock they can edit/approve, written to `diagnostic_intake` and `rock`.

### M2 — Psych baseline
**PRD ref:** §10.2
**Ships:** WHO-5, NGSE, IPS instruments + deterministic scoring; values card-sort (pick 3); WHO-5 floor policy (very-low-score supportive-resources message, PRD §16 risk 5).
**Depends on:** M0 schema (`scale_administration`).
**Exit criteria:** a user completes all three scales at cycle_day 0; scores are stored and a floor-policy message fires correctly on a synthetic low WHO-5 input.

### M3 — Profit baseline
**PRD ref:** §10.1
**Ships:** Xero connector (OAuth + P&L pull) writing `profit_baseline`; manual-entry fallback form.
**Depends on:** M0 schema.
**Exit criteria:** a connected user's trailing-12-month P&L is pulled and stored; a disconnected user can enter it manually and get the same downstream behavior.

### M4 — Daily loop
**PRD ref:** §8.2
**Ships:** Morning Directive screen (single directive, if-then + value-link + rock-link, anchor-time push), Directive personalizer (`AGENTS.md` Role 2) wired to slot-fill `content/protocols/*.md` cards, midday on-track/stuck tap.
**Depends on:** M1 (rock), `content/protocols/*.md`, `contracts/directive.schema.json`.
**Exit criteria:** a user receives one directive per day at their chosen anchor time, sees only that directive (nothing else on screen), and can mark on-track or stuck.

### M5 — Verification engine
**PRD ref:** §9
**Ships:** Proof capture UI (<60s target), Verification judge (`AGENTS.md` Role 4) two-pass pipeline, confidence-threshold fallback to attested, verified/attested display split.
**Depends on:** M4; `contracts/verification-artifact.schema.json`; storage bucket + retention policy from `BLUEPRINT.md` §8.
**Exit criteria:** a submitted artifact is classified verified or attested within the pipeline, capture-to-result stays under the 60-second budget in testing, and low-confidence cases never silently become verified.

### M6 — Resistance Triage
**PRD ref:** §8.4
**Ships:** Skip Log flow, deterministic block-type classifier (signal phrase → category), the 4-branch router, delivery of the matching `content/resistance-triage/*.md` micro-protocol via Coaching chat (`AGENTS.md` Role 3).
**Depends on:** M4; `contracts/skip-log.schema.json`.
**Exit criteria:** a skipped directive routes to exactly one of the four branches and the user receives the correct micro-protocol; all four branches are reachable in testing.

### M7 — Sunday Business Review
**PRD ref:** §8.3
**Ships:** n8n-scheduled Sunday trigger, deterministic profit-pulse/VACR-trend/micro-check computation, Sunday Review writer (`AGENTS.md` Role 5) narration + WOOP session producing next week's 3 lead actions and Monday's frog.
**Depends on:** M3 (Xero), M5 (VACR needs verified data), `contracts/sunday-review.schema.json`.
**Exit criteria:** the review generates automatically Sunday morning with no missing fields, and its WOOP output produces real `weekly_lead_action` rows feeding M4's next directive.

### M8 — Scoring dashboard
**PRD ref:** §10.3
**Ships:** VACR computation job (trailing 30 directives), streak tracking (loop-completion, not outcome), scale-trend view (WHO-5/NGSE/IPS across day 0/45/90), D7/D30 retention and Sunday-open-rate instrumentation.
**Depends on:** M5, M2.
**Exit criteria:** VACR matches a hand-computed value on a seeded test user; verified and attested counts never blend.

### M9 — Billing + Founding Cohort + Patient Zero gate
**PRD ref:** §10.4, §13
**Ships:** $49 14-Day Activation Sprint and $199/cycle billing (Founding Cohort $99/cycle), cycle close flow, Cycle Report, automated §10.4 gate check (VACR ≥75%, profit trend, WHO-5/NGSE flat-or-improved, "would pay again" prompt) feeding the Founding Cohort go/no-go decision.
**Depends on:** M1–M8 all producing real data for at least one full cycle.
**Exit criteria:** a completed 90-day cycle produces a Cycle Report and an automated, correct pass/fail read against all four §10.4 conditions.

---

## Sequencing notes

- M1→M4 is the critical path (rock → directive) — nothing downstream works without it.
- M5 and M6 can build in parallel once M4 ships; both only need the directive object, not each other.
- M7 hard-depends on M3 and M5 — don't start it before both are real, or the review has nothing true to narrate.
- M9's gate (§10.4) is the actual go/no-go for Phase 2 (PRD §17) — treat it as the milestone that matters most for scope discipline, not the last checkbox.
