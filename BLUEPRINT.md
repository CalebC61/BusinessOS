# BLUEPRINT — Operator, Phase 1

Technical architecture for the Phase 1 thin product (Diagnostic, Daily Loop, Verification Engine, Sunday Review, Scales). Written against `Operator_PRD_v0.1.md`. Phase 2/3 concepts (business canon curriculum, Executioner integration, white-label) are named where relevant but not designed here — see PRD §17.

Companion files: `AGENTS.md` (the 5 LLM roles), `MILESTONES.md` (build order), `contracts/` (JSON schemas for every object below), `content/` (Protocol Library + Resistance Triage cards).

---

## 1. Stack

| Layer | Choice | Role |
|---|---|---|
| App shell | Next.js | Daily/weekly surfaces, onboarding flow, dashboard |
| Database + auth + storage | Supabase (Postgres) | System of record; artifact storage for verification uploads |
| LLM | Claude API | The 5 grounded roles in `AGENTS.md` — never the arithmetic, scheduling, or crisis path |
| Orchestration | n8n | Sunday Review trigger (calendar-based), Xero pull, notification dispatch |
| Financial data | Xero | Profit baseline (§10.1) and trailing P&L for the weekly pulse |

Rationale: this is the stack the PRD (§12) says Business OS already standardizes on — Operator adds the Protocol Library, verification pipeline, and scoring engine on top of it, it doesn't introduce a new stack.

## 2. The deterministic / LLM split (PRD §11)

This is the load-bearing architectural decision. Every subsystem below is tagged **[DET]** (code, never model judgment) or **[LLM]** (a Claude call, always grounded in a fixed source, never free-running).

| Subsystem | Type | Notes |
|---|---|---|
| Crisis classifier | **DET** | Runs on every free-text input *before* any LLM sees it. Positive signal → hard-coded 988 interstitial, session pauses. This path never touches a model. |
| VACR, streaks, scale scoring | **DET** | Pure arithmetic over stored rows. See §5. |
| Scheduling, notifications, billing | **DET** | Anchor-time pushes, Sunday trigger, cycle billing state machine. |
| Diagnostic decision tree | **DET** (structure) | The tree is fixed data; see §3. |
| Diagnostic interviewer | **LLM** | Walks the fixed tree; cannot ask outside it. |
| Directive personalizer | **LLM** | Slot-fills a fixed Protocol Library card; cannot author new text. |
| Coaching chat | **LLM** | RAG-grounded over Protocol Library + user's own data; declines out-of-scope. |
| Verification judge | **LLM** | Two-pass extract-then-check against a rubric; low confidence → attested fallback (never guesses a pass). |
| Sunday Review writer | **LLM** | Narrates pre-computed numbers; generates zero numbers itself. |

Full role specs (grounding, IO schema, system prompt scaffold, hallucination controls) live in `AGENTS.md`.

## 3. Onboarding Diagnostic (PRD §8.1)

1. **Business intake** — branching, LLM-conducted interview grounded in a fixed decision tree that locates the constraint per the PRD §7 canon map (Constraint Finder, Offer Bench, Lead Engine, Money Rules, Time Buyback, Owner-Independence, Execution Cadence). The tree structure and its routing logic are deterministic data (`contracts/diagnostic-tree.schema.json`); the LLM selects a path through it and ranks hypotheses, it does not invent branches.
2. **Psych baseline** — WHO-5, NGSE, IPS (fixed instruments, deterministic scoring) + values card-sort (pick 3).
3. **Profit baseline** — Xero P&L pull, or manual monthly entry fallback.
4. **Output** — the Operator Scorecard: named constraint, 90-day rock proposal (user edits/approves), baseline numbers. Doubles as the free lead magnet (PRD §13).

## 4. Data model

Supabase/Postgres. Grouped by the loop that produces the row. `writer` marks who writes it: `det` (deterministic job), `llm` (an `AGENTS.md` role, always via the deterministic pipeline that calls it), `xero` (external pull).

### 4.1 Onboarding

```sql
diagnostic_intake (
  id uuid pk,
  user_id uuid fk,
  business_model text, offer text, pricing jsonb,
  ttm_revenue numeric, lead_sources jsonb, hours_breakdown jsonb,
  what_tried text,
  constraint_hypothesis text,      -- one of the §7 module names
  constraint_confidence numeric,
  created_at timestamptz
)  -- writer: llm (diagnostic interviewer), validated against contracts/diagnostic-intake.schema.json

scale_administration (
  id uuid pk,
  user_id uuid fk,
  instrument text check (instrument in ('who5','ngse','ips')),
  responses jsonb,                 -- raw item responses
  score numeric,                   -- deterministic scoring function output
  administered_at timestamptz,
  cycle_day int                    -- 0 / 45 / 90
)  -- writer: det (scoring is pure function; UI only collects responses)

profit_baseline (
  id uuid pk,
  user_id uuid fk,
  source text check (source in ('xero','manual')),
  trailing_12mo_pnl jsonb,
  captured_at timestamptz
)  -- writer: xero pull via n8n, or det (manual entry validation)
```

### 4.2 Rock → directive chain

```sql
cycle (
  id uuid pk, user_id uuid fk,
  start_date date, end_date date,
  billing_status text, gate_result jsonb,  -- §10.4 pass/fail snapshot at cycle end
  created_at timestamptz
)  -- writer: det

rock (
  id uuid pk, cycle_id uuid fk,
  statement text, constraint_module text,  -- §7 module name
  status text check (status in ('proposed','approved','active','closed')),
  created_at timestamptz
)  -- writer: llm (diagnostic interviewer proposes; user approves via det state change)

weekly_lead_action (
  id uuid pk, rock_id uuid fk,
  week_of date, statement text,
  created_at timestamptz
)  -- writer: llm (Sunday Review writer, via WOOP session)

daily_directive (
  id uuid pk, weekly_lead_action_id uuid fk, user_id uuid fk,
  if_then_plan text,               -- "if [cue], then I will [action]"
  value_link text, rock_link uuid fk,
  verification_spec jsonb,         -- artifact types + rubric, see contracts/verification-artifact.schema.json
  anchor_time time,
  status text check (status in ('pending','done','skipped')),
  created_at timestamptz
)  -- writer: llm (directive personalizer, slot-fills a protocol card)
```

### 4.3 Verification & resistance

```sql
verification_artifact (
  id uuid pk, directive_id uuid fk,
  artifact_type text,               -- screenshot | photo | document | calendar_record | xero_object | call_log
  storage_path text,                -- Supabase storage
  extraction jsonb,                 -- vision/LLM pass 1 output
  rubric_result jsonb,              -- pass 2 checklist result
  confidence numeric,
  status text check (status in ('verified','attested')),
  created_at timestamptz
)  -- writer: llm (verification judge) writes extraction/rubric/status; det enforces the confidence threshold and fallback

skip_log (
  id uuid pk, directive_id uuid fk,
  thought_selected text,            -- user-picked from the triage prompt
  triage_category text check (triage_category in ('low_expectancy','low_value','delay','impulsiveness')),
  routed_protocol_id text,          -- content/resistance-triage/*.md id
  created_at timestamptz
)  -- writer: det (classification is a fixed lookup from signal phrase to category, per PRD §8.4 table)

resistance_triage_event (
  id uuid pk, user_id uuid fk, skip_log_id uuid fk,
  block_type text, signal_phrase text, micro_protocol_id text,
  created_at timestamptz
)  -- writer: det
```

### 4.4 Scoring & review

```sql
vacr_snapshot (
  id uuid pk, user_id uuid fk,
  window_size int default 30,       -- trailing N actions
  verified_count int, assigned_count int, vacr numeric,
  computed_at timestamptz
)  -- writer: det

sunday_review (
  id uuid pk, user_id uuid fk, cycle_id uuid fk,
  profit_pulse jsonb, vacr_trend jsonb, pattern_insight text,
  micro_check jsonb, woop_output jsonb,
  week_of date, created_at timestamptz
)  -- writer: det computes profit_pulse/vacr_trend/micro_check; llm (Sunday Review writer) fills pattern_insight narration + woop_output via WOOP session
```

## 5. VACR & scoring (deterministic, PRD §10.3)

```
VACR = verified_completions / assigned_directives   (trailing 30 directives, per user)
```

Verified-only counts toward VACR; self-attested completions are tracked and displayed separately, never blended in. This split is a commercial asset (guarantee eligibility, PRD §13) — it must never be computable any other way than a direct query over `verification_artifact.status`.

## 6. API / route map

| Route | Loop | Calls |
|---|---|---|
| `POST /api/diagnostic/turn` | Onboarding | Diagnostic interviewer (LLM) → writes `diagnostic_intake` |
| `POST /api/diagnostic/scorecard` | Onboarding | Det: assembles Scorecard from intake + baselines |
| `POST /api/directive/today` | Daily | Det: fetches or generates today's `daily_directive` via Directive personalizer |
| `POST /api/directive/:id/verify` | Daily | Verification judge (LLM) → writes `verification_artifact`; det applies confidence threshold |
| `POST /api/directive/:id/skip` | Daily | Det: classifies skip → `skip_log` + `resistance_triage_event`; may call Coaching chat for the micro-protocol delivery |
| `GET /api/vacr` | Daily/Weekly | Det: computes `vacr_snapshot` on read or via scheduled job |
| `POST /api/review/sunday` | Weekly | n8n-triggered: det pulls Xero + VACR trend, then Sunday Review writer (LLM) narrates |
| `POST /api/cycle/:id/close` | 90-day | Det: assembles Cycle Report, runs §10.4 gate |

## 7. Verification pipeline (PRD §9)

1. **Extraction pass** (LLM, vision) — what does the artifact show, structured output only.
2. **Rubric pass** (deterministic checklist + LLM judgment) — does it satisfy `verification_spec`.
3. Confidence below threshold → **attested** fallback. Never silently upgrades to verified.

Hard constraint: capture must complete in **under 60 seconds** — every `verification_spec` in the Protocol Library is authored backwards from that limit (see `content/`).

## 8. Privacy & retention

Uploads may contain customer PII. Storage bucket policy: redaction guidance shown at capture time, defined retention window (delete after cycle close + grace period), uploads never used for anything but verification — no secondary use, no training.
