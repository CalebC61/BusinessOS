"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ScaleDefinition, ValuesDeck } from "@/lib/scales/definitions";
import styles from "./baseline.module.css";

type Props = { scales: ScaleDefinition[]; valuesDeck: ValuesDeck };

type Step =
  | { kind: "scale"; index: number }
  | { kind: "floor-notice"; completedIndex: number }
  | { kind: "values" }
  | { kind: "done" };

export function BaselineWizard({ scales, valuesDeck }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "scale", index: 0 });
  const [responses, setResponses] = useState<number[]>([]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentScale = step.kind === "scale" ? scales[step.index] : null;

  function setResponse(itemIndex: number, value: number) {
    setResponses((prev) => {
      const next = [...prev];
      next[itemIndex] = value;
      return next;
    });
  }

  const allAnswered =
    currentScale !== null &&
    responses.length === currentScale.items.length &&
    responses.every((r) => typeof r === "number");

  async function submitScale() {
    if (!currentScale || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scales/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instrument: currentScale.instrument,
          responses,
          cycle_day: 0,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const result: { floor_policy_triggered: boolean } = await res.json();
      setResponses([]);

      const completedStep = step as { kind: "scale"; index: number };

      if (result.floor_policy_triggered) {
        setStep({ kind: "floor-notice", completedIndex: completedStep.index });
        return;
      }

      advancePastScale(completedStep);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function advancePastScale(current: { kind: "scale"; index: number }) {
    const nextIndex = current.index + 1;
    if (nextIndex < scales.length) {
      setStep({ kind: "scale", index: nextIndex });
    } else {
      setStep({ kind: "values" });
    }
  }

  function toggleValue(id: string) {
    setSelectedValues((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= valuesDeck.pick_count) return prev;
      return [...prev, id];
    });
  }

  async function submitValues() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/values/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: selectedValues }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      setStep({ kind: "done" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step.kind === "floor-notice") {
    return (
      <main className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Before you continue</p>
          <h1 className={styles.title}>A quick, genuine check-in</h1>
          <p className={styles.body}>
            Your well-being answers were on the lower end. That&apos;s worth taking
            seriously on its own — not just as an input to this program. If things
            feel heavy right now, consider talking to a professional or someone you
            trust. If you&apos;re in crisis, the 988 Suicide &amp; Crisis Lifeline is
            free and available anytime — call or text 988.
          </p>
          <p className={styles.bodyDim}>
            This isn&apos;t a diagnosis — Operator isn&apos;t a clinical tool. It&apos;s
            just a nudge to take care of yourself first.
          </p>
          <button
            className={styles.submit}
            type="button"
            onClick={() => advancePastScale({ kind: "scale", index: step.completedIndex })}
          >
            Continue
          </button>
        </div>
      </main>
    );
  }

  if (step.kind === "values") {
    return (
      <main className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Values &middot; pick {valuesDeck.pick_count}</p>
          <h1 className={styles.title}>{valuesDeck.instructions}</h1>

          <div className={styles.valueGrid}>
            {valuesDeck.cards.map((card) => {
              const selected = selectedValues.includes(card.id);
              return (
                <button
                  type="button"
                  key={card.id}
                  className={selected ? styles.valueCardSelected : styles.valueCard}
                  onClick={() => toggleValue(card.id)}
                >
                  <span className={styles.valueLabel}>{card.label}</span>
                  <span className={styles.valueDescription}>{card.description}</span>
                </button>
              );
            })}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.submit}
            type="button"
            onClick={submitValues}
            disabled={loading || selectedValues.length !== valuesDeck.pick_count}
          >
            {loading ? "Saving…" : `Continue (${selectedValues.length}/${valuesDeck.pick_count})`}
          </button>
        </div>
      </main>
    );
  }

  if (step.kind === "done") {
    return (
      <main className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Baseline complete</p>
          <h1 className={styles.title}>Day-0 baseline saved</h1>
          <p className={styles.body}>
            WHO-5, NGSE, and IPS are recorded, along with your 3 values. These get
            re-administered at day 45 and day 90 to see what actually moved.
          </p>
          <button className={styles.submit} type="button" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (!currentScale) return null;

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>
          {currentScale.name} &middot; {(step as { index: number }).index + 1} of {scales.length}
        </p>
        <h1 className={styles.title}>{currentScale.instructions}</h1>

        <div className={styles.items}>
          {currentScale.items.map((item, itemIndex) => (
            <fieldset key={itemIndex} className={styles.item}>
              <legend className={styles.itemText}>{item}</legend>
              <div className={styles.options}>
                {currentScale.response_scale.map((opt) => (
                  <label
                    key={opt.value}
                    className={
                      responses[itemIndex] === opt.value ? styles.optionSelected : styles.option
                    }
                  >
                    <input
                      type="radio"
                      name={`item-${itemIndex}`}
                      value={opt.value}
                      checked={responses[itemIndex] === opt.value}
                      onChange={() => setResponse(itemIndex, opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submit} type="button" onClick={submitScale} disabled={loading || !allAnswered}>
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </main>
  );
}
