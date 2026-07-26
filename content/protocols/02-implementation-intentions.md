---
id: implementation-intentions
name: Implementation Intentions
answers_pain: "I know what I should be doing but I just don't do it"
evidence: "Gollwitzer & Sheeran, 2006 (meta-analysis)"
---

## Purpose

Removes the decision moment at execution time by pre-committing the exact cue and action the night before. This is the literal template every `daily_directive.if_then_plan` is rendered from (`contracts/directive.schema.json`) — not a special-case exercise, the default form of every directive in the product.

## Script (personalization slots)

> If `{{cue}}`, then I will `{{action}}`.

Where `{{cue}}` is a specific time, place, or preceding event (never "when I feel like it" — that defeats the mechanism), and `{{action}}` is the smallest concrete version of the day's keystone task. Slots are filled by the Directive personalizer (AGENTS.md Role 2) from the weekly lead action + user's existing routine/anchor time.

## Contraindications

Reject vague cues at generation time — "if I have time" or "if I'm motivated" are not valid `{{cue}}` values and should be rejected by the personalizer's slot validation, not shipped to the user.

## Evidence reference

Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. *Advances in Experimental Social Psychology*, 38, 69–119.
