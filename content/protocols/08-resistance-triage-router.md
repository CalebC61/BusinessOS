---
id: resistance-triage-router
name: Resistance Triage Router (Temporal Motivation Theory)
answers_pain: "How do I stay on task"
evidence: "Steel, 2007 (procrastination meta-analysis, TMT)"
---

## Purpose

This is the connective-tissue card (PRD §8.4) — not an exercise the user experiences directly, but the classification layer that routes every skip or "stuck" tap to one of four branch protocols. Classification of `thought_selected` into `triage_category` is deterministic (a fixed phrase-to-category lookup — see `contracts/skip-log.schema.json`), not a model judgment call; the LLM's role is limited to delivering the routed branch's script via Coaching chat (AGENTS.md Role 3).

## Script (personalization slots)

No user-facing script of its own. Routes to exactly one of:

| Block type | Branch card |
|---|---|
| Low expectancy | `content/resistance-triage/low-expectancy.md` |
| Low value | `content/resistance-triage/low-value.md` |
| Delay | `content/resistance-triage/delay.md` |
| Impulsiveness | `content/resistance-triage/impulsiveness.md` |

## Contraindications

Never let a skip go unclassified — if a user's `thought_selected` doesn't cleanly match a signal-phrase pattern, default to `delay` (the highest-base-rate category per Steel 2007) rather than leaving the skip untriaged.

## Evidence reference

Steel, P. (2007). The nature of procrastination: A meta-analytic and theoretical review of quintessential self-regulatory failure. *Psychological Bulletin*, 133(1), 65–94.
