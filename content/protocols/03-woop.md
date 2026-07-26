---
id: woop-mental-contrasting
name: WOOP (Wish–Outcome–Obstacle–Plan)
answers_pain: "Intention–action gap, at the planning moment"
evidence: "Oettingen & Mayer, 2002; Oettingen, 2014"
---

## Purpose

Runs at two points in the product: the evening "Plan tomorrow" step (PRD §8.2) before committing to the next directive, and the Sunday Business Review (PRD §8.3) before committing to next week's 3 lead actions. Surfaces the obstacle in advance instead of letting positive fantasizing substitute for planning — the explicit reason "manifestation"-style positive fantasizing is on the exclusion list (PRD §6.3).

## Script (personalization slots)

> **Wish:** what do you want to accomplish — `{{wish}}`?
> **Outcome:** if it goes well, what does that look like — `{{outcome}}`?
> **Obstacle:** what in you is most likely to get in the way — `{{obstacle}}`?
> **Plan:** if `{{obstacle}}` happens, then I will `{{plan}}`.

Output feeds directly into `contracts/sunday-review.schema.json`'s `woop_output` object and, at the daily scale, into the next `daily_directive.if_then_plan`.

## Contraindications

The obstacle must be internal (a thought, habit, or impulse), not external/circumstantial — "the obstacle is my competitor" is not a valid WOOP obstacle and should be redirected back to an internal one during the session.

## Evidence reference

Oettingen, G., & Mayer, D. (2002). The motivating function of thinking about the future: Expectations versus fantasies. *Journal of Personality and Social Psychology*, 83(5), 1198–1212. Oettingen, G. (2014). *Rethinking Positive Thinking: Inside the New Science of Motivation.*
