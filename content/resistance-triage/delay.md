---
id: five-minute-restart
triage_category: delay
signal_phrases: ["I'll do it later", "not right now", "tomorrow"]
routes_to: ["implementation-intentions"]
---

# Delay

**Signal:** deferral language — the user intends to do it, just not now. This is the default/highest-base-rate category (Steel, 2007) and the fallback when a skip's `thought_selected` doesn't cleanly match another pattern.

**Routed protocol:** shrink the directive to its 5-minute version and prompt immediate action ("just the first 5 minutes of `{{action}}`, right now"); if that's genuinely not possible in the moment, re-run `02-implementation-intentions.md` for a fresh, more specific if-then plan rather than a vague "later."

**Delivery:** Coaching chat (AGENTS.md Role 3), immediate — this branch is designed to interrupt the deferral in the same session it's detected, not queue a follow-up.
