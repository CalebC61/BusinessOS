---
id: goal-setting-90-day-rock
name: Goal-Setting — the 90-Day Rock
answers_pain: "Focus on the 20%"
evidence: "Locke & Latham, 2002"
---

## Purpose

Structures the entire cascade the product enforces: one specific, difficult 90-day rock → 3 weekly lead actions → 1 daily directive, nothing else surfaces. This card is less an exercise and more the constraint that shapes `rock`, `weekly_lead_action`, and `daily_directive` generation (`BLUEPRINT.md` §4.2) — every directive must trace to a live rock or it shouldn't exist.

## Script (personalization slots)

> **Rock (90 days):** `{{rock_statement}}` — specific and difficult, not "grow the business."
> **This week's 3 lead actions:** `{{lead_action_1}}`, `{{lead_action_2}}`, `{{lead_action_3}}` — each must descend from the rock.
> **Today's directive:** the single highest-leverage step from one of today's lead actions.

Enforced at generation time: the Directive personalizer (AGENTS.md Role 2) rejects any directive whose `rock_link` is null or points to a closed rock.

## Contraindications

A rock stated as "do your best" or without a measurable definition of done fails the specific-and-difficult test and should be sent back to the diagnostic/onboarding flow for re-statement, not accepted as-is.

## Evidence reference

Locke, E. A., & Latham, G. P. (2002). Building a practically useful theory of goal setting and task motivation. *American Psychologist*, 57(9), 705–717.
