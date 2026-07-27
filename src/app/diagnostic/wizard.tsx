"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MODULE_LABELS, type ConstraintModule } from "@/lib/diagnostic/tree";
import styles from "./diagnostic.module.css";

type HistoryTurn = { question: string; answer: string };
type IntakeRecord = Record<string, unknown>;
type HypothesisRanking = { module: ConstraintModule; confidence: number }[];

type TurnResponse = {
  next_question: string | null;
  tree_node_id: string;
  hypothesis_ranking: HypothesisRanking;
  intake_record?: IntakeRecord;
  rock_proposal?: string | null;
};

type Props = { initialNodeId: string; initialQuestion: string };

export function DiagnosticWizard({ initialNodeId, initialQuestion }: Props) {
  const router = useRouter();

  const [nodeId, setNodeId] = useState(initialNodeId);
  const [question, setQuestion] = useState<string | null>(initialQuestion);
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<HistoryTurn[]>([]);
  const [intakeRecord, setIntakeRecord] = useState<IntakeRecord>({});
  const [ranking, setRanking] = useState<HypothesisRanking | null>(null);
  const [rockStatement, setRockStatement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topModule = ranking?.[0]?.module ?? null;
  const topConfidence = ranking?.[0]?.confidence ?? 0;

  async function submitAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/diagnostic/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentNodeId: nodeId,
          latestAnswer: answer,
          history,
          priorIntakeRecord: intakeRecord,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const result: TurnResponse = await res.json();

      setHistory((h) => [...h, { question: question ?? "", answer }]);
      setIntakeRecord(result.intake_record ?? intakeRecord);
      setAnswer("");

      if (result.next_question === null) {
        setRanking(result.hypothesis_ranking);
        setRockStatement(result.rock_proposal ?? "");
        setNodeId(result.tree_node_id);
        setQuestion(null);
      } else {
        setNodeId(result.tree_node_id);
        setQuestion(result.next_question);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function approveRock() {
    if (!topModule || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/diagnostic/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeRecord,
          constraintModule: topModule,
          constraintConfidence: topConfidence,
          rockStatement,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (ranking && topModule) {
    return (
      <main className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Operator Scorecard</p>
          <h1 className={styles.title}>Your constraint: {MODULE_LABELS[topModule]}</h1>
          <p className={styles.subtitle}>
            {Math.round(topConfidence * 100)}% confidence, from {history.length} answers.
          </p>

          <ul className={styles.rankingList}>
            {ranking
              .slice()
              .sort((a, b) => b.confidence - a.confidence)
              .map((r) => (
                <li key={r.module} className={styles.rankingItem}>
                  <span>{MODULE_LABELS[r.module]}</span>
                  <span className={styles.rankingBar}>
                    <span
                      className={styles.rankingBarFill}
                      style={{ width: `${Math.round(r.confidence * 100)}%` }}
                    />
                  </span>
                </li>
              ))}
          </ul>

          <label className={styles.label} htmlFor="rock">
            Proposed 90-day rock — edit until it&apos;s right, then approve
          </label>
          <textarea
            id="rock"
            className={styles.textarea}
            value={rockStatement}
            onChange={(e) => setRockStatement(e.target.value)}
            rows={3}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.submit}
            type="button"
            onClick={approveRock}
            disabled={loading || !rockStatement.trim()}
          >
            {loading ? "Saving…" : "Approve rock & finish diagnostic"}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>
          Operator Diagnostic — question {history.length + 1}
        </p>
        <h1 className={styles.title}>{question}</h1>

        <form onSubmit={submitAnswer} className={styles.form}>
          <textarea
            className={styles.textarea}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Answer in your own words…"
            autoFocus
          />

          {error && <p className={styles.error}>{error}</p>}

          <button className={styles.submit} type="submit" disabled={loading || !answer.trim()}>
            {loading ? "Thinking…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
