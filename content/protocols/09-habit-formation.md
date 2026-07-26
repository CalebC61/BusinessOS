---
id: habit-formation
name: Habit Formation (Anchor Stacking)
answers_pain: "Consistency"
evidence: "Lally et al., 2010 (~66-day median)"
---

## Purpose

Governs how anchor times and streaks work, not a one-off exercise. The daily loop is anchored to fixed times and existing routines (habit stacking) at onboarding; streaks track *loop completion* — did the user run the loop today — not task success, so a hard day that still gets logged doesn't break the streak the way a missed outcome would.

## Script (personalization slots)

> You already do `{{existing_routine}}` at `{{existing_time}}`. Right after that, your directive will land — same time, every day, until it's automatic.

Slots filled once at onboarding from the user's stated existing routine; `anchor_time` on every `daily_directive` inherits this unless explicitly changed.

## Contraindications

Do not let the app suggest a new anchor time more than once every few weeks — habit stacking depends on repetition at a fixed point; frequent anchor-time changes undermine the exact mechanism this card exists to use.

## Evidence reference

Lally, P., et al. (2010). How are habits formed: Modelling habit formation in the real world. *European Journal of Social Psychology*, 40(6), 998–1009.
