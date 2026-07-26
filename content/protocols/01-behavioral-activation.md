---
id: behavioral-activation
name: Behavioral Activation
answers_pain: "Why do I feel like I have zero emotion... can't get emotionally charged"
evidence: "Richards et al., 2016 (COBRA, Lancet)"
---

## Purpose

Acts on the design insight that anchors the whole product (PRD §6.2): the action–motivation loop runs backwards from how the user believes it runs. This card is the base template for the entire daily loop — act first, log the mood after, let the data show the user the loop worked. It is not a standalone exercise the user opts into; it's the shape of every Morning Directive.

## Script (personalization slots)

> Before you do `{{action}}` today, rate how ready you feel to do it, 0–10 (you don't need a high number — do it anyway). After you've done it, come back and rate your mood, 0–10.

Slots: `{{action}}` (from the directive personalizer, PRD §8.2), `{{pre_rating}}`, `{{post_rating}}`.

Rendered mood-before / mood-after pair is stored with the directive and shown back to the user on the Sunday Review as a trend, not a single data point — one data point proves nothing; the trend is the evidence.

## Contraindications

Do not present this as evidence the user should always feel better after acting — some actions are simply hard and the mood delta will be flat or negative on a given day. The card must never editorialize a bad reading; it just logs it.

## Evidence reference

Richards, D. A., et al. (2016). Cost and Outcome of Behavioural Activation versus Cognitive Behavioural Therapy for Depression (COBRA): a randomised, controlled, non-inferiority trial. *The Lancet*, 388(10047), 871–880.
