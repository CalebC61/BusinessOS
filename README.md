# Business OS

**Operator** is Module 0 of Business OS — an evidence-based execution coach that assigns one verified action per day and scores itself in dollars of profit. See `Operator_PRD_v0.1.md` (in the originating conversation) for the full product spec.

This repo currently holds the Phase 1 planning/architecture layer for Operator, written against that PRD:

- [`BLUEPRINT.md`](./BLUEPRINT.md) — technical architecture: stack, deterministic/LLM split, data model, API map, verification pipeline
- [`AGENTS.md`](./AGENTS.md) — full spec for every LLM role (grounding, I/O schema, hallucination controls) plus the deterministic crisis classifier
- [`MILESTONES.md`](./MILESTONES.md) — M0–M9 build order for the Phase 1 thin product
- [`contracts/`](./contracts) — JSON Schemas for every object that crosses the deterministic/LLM boundary
- [`content/`](./content) — the Protocol Library: one card per behavior-change technique, the Resistance Triage router and its four branches, and diagnostic-routing metadata for the seven business-canon constraint modules

Phase 2 (full business canon curriculum, automated Resistance Triage delivery beyond routing, Executioner integration) and Phase 3 (white-label) are out of scope for these documents — see PRD §17 for their gating.
