---
id: behavioral-experiments
name: Behavioral Experiment
answers_pain: "Untested negative predictions never get tested"
evidence: "Beck (CBT behavioral experiment methodology)"
---

## Purpose

Chains directly from a Thought Record (`04-cognitive-restructuring.md`). Turns the balanced thought into a real, scheduled test inside the business itself, with the pre-registered confidence rating checked against what actually happened — this is what separates Operator from a content platform: the prediction gets tested in the business, not just reframed on a screen.

## Script (personalization slots)

> **Prediction to test:** `{{prediction}}` (confidence: `{{confidence_rating}}`%)
> **Experiment:** `{{action}}`, by `{{deadline}}`
> **What would confirm the prediction / what would disconfirm it:** stated in advance
> **Result:** logged after the fact via the verification pipeline (`content/protocols/*.md` verification specs already attached to `{{action}}`)
> **Confidence, re-rated:** `{{confidence_rating_after}}`%

The before/after confidence delta is the artifact shown back to the user — the point is the gap between predicted and actual, not the raw outcome.

## Contraindications

Never schedule an experiment whose failure mode is irreversible or high-stakes (e.g., firing a client to test a pricing prediction) — the experiment must be small enough that either outcome is informative and recoverable.

## Evidence reference

Beck, A. T. — behavioral experiment methodology within CBT (public-domain protocol structure).
