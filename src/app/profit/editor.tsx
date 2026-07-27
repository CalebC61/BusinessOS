"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { MonthlyPnL } from "@/lib/xero/report";
import styles from "./profit.module.css";

type Props = {
  xeroConnected: boolean;
  tenantName: string | null;
  justConnected: boolean;
  connectError: string | null;
  initialMonthly: MonthlyPnL[];
};

const ERROR_MESSAGES: Record<string, string> = {
  xero_state_mismatch: "That Xero connection attempt looked altered — try connecting again.",
  xero_no_organisation: "No Xero organisation was authorized. Try connecting again and select one.",
  xero_connect_failed: "Couldn't complete the Xero connection. Try again in a moment.",
};

export function ProfitBaselineEditor({
  xeroConnected,
  tenantName,
  justConnected,
  connectError,
  initialMonthly,
}: Props) {
  const router = useRouter();
  const [monthly, setMonthly] = useState<MonthlyPnL[]>(initialMonthly);
  const [source, setSource] = useState<"xero" | "manual">("manual");
  const [pulling, setPulling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(
    connectError ? (ERROR_MESSAGES[connectError] ?? "Something went wrong connecting Xero.") : null,
  );
  const [saved, setSaved] = useState(false);

  function updateField(index: number, field: "revenue" | "expenses", value: string) {
    const num = value === "" ? 0 : Number(value);
    setMonthly((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: Number.isFinite(num) ? num : 0 };
      row.net_profit = row.revenue - row.expenses;
      next[index] = row;
      return next;
    });
  }

  async function pullFromXero() {
    setPulling(true);
    setError(null);
    try {
      const res = await fetch("/api/xero/pull", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const result: { monthly: MonthlyPnL[] } = await res.json();
      setMonthly(result.monthly);
      setSource("xero");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pull from Xero failed");
    } finally {
      setPulling(false);
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profit-baseline/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, monthly }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const totals = monthly.reduce(
    (acc, m) => ({
      revenue: acc.revenue + m.revenue,
      expenses: acc.expenses + m.expenses,
      net_profit: acc.net_profit + m.net_profit,
    }),
    { revenue: 0, expenses: 0, net_profit: 0 },
  );

  if (saved) {
    return (
      <main className={styles.wrap}>
        <div className={styles.card}>
          <p className={styles.eyebrow}>Profit baseline complete</p>
          <h1 className={styles.title}>Baseline saved</h1>
          <p className={styles.body}>
            Trailing 12-month net profit: {formatCurrency(totals.net_profit)}. This is
            what future cycles measure against.
          </p>
          <button className={styles.submit} type="button" onClick={() => router.push("/dashboard")}>
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Profit baseline</p>
        <h1 className={styles.title}>Trailing 12-month P&amp;L</h1>
        <p className={styles.bodyDim}>
          Pull it from Xero, or enter it month by month — either way it&apos;s
          editable below before you save.
        </p>

        <div className={styles.xeroRow}>
          {xeroConnected ? (
            <>
              <span className={styles.connected}>Connected to {tenantName ?? "Xero"}</span>
              <button className={styles.pullButton} type="button" onClick={pullFromXero} disabled={pulling}>
                {pulling ? "Pulling…" : "Pull from Xero"}
              </button>
            </>
          ) : (
            <a className={styles.pullButton} href="/api/xero/connect">
              Connect Xero
            </a>
          )}
        </div>

        {justConnected && !error && (
          <p className={styles.success}>Xero connected — pull your P&amp;L below.</p>
        )}
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Net profit</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m, i) => (
                <tr key={m.month}>
                  <td className={styles.monthCell}>{m.month}</td>
                  <td>
                    <input
                      className={styles.numberInput}
                      type="number"
                      value={m.revenue}
                      onChange={(e) => updateField(i, "revenue", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className={styles.numberInput}
                      type="number"
                      value={m.expenses}
                      onChange={(e) => updateField(i, "expenses", e.target.value)}
                    />
                  </td>
                  <td className={styles.netCell}>{formatCurrency(m.net_profit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{formatCurrency(totals.revenue)}</td>
                <td>{formatCurrency(totals.expenses)}</td>
                <td className={styles.netCell}>{formatCurrency(totals.net_profit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <button className={styles.submit} type="button" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save profit baseline"}
        </button>
      </div>
    </main>
  );
}

function formatCurrency(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
