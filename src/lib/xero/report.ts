const REPORT_URL = "https://api.xero.com/api.xro/2.0/Reports/ProfitAndLoss";

export type MonthlyPnL = { month: string; revenue: number; expenses: number; net_profit: number };

export type NormalizedPnL = {
  period_start: string;
  period_end: string;
  monthly: MonthlyPnL[];
  total_revenue: number;
  total_expenses: number;
  total_net_profit: number;
};

/** Last 12 complete calendar months — excludes the current, still-in-progress month. */
export function trailingTwelveMonthRange(now = new Date()): { fromDate: string; toDate: string } {
  const toDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); // last day of previous month
  const fromDate = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth() - 11, 1));
  return { fromDate: isoDate(fromDate), toDate: isoDate(toDate) };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function fetchProfitAndLossReport(
  accessToken: string,
  tenantId: string,
): Promise<unknown> {
  const { fromDate, toDate } = trailingTwelveMonthRange();
  const params = new URLSearchParams({
    fromDate,
    toDate,
    periods: "11",
    timeframe: "MONTH",
  });

  const res = await fetch(`${REPORT_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Xero P&L report request failed (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

type XeroCell = { Value?: string };
type XeroRow = { RowType?: string; Title?: string; Cells?: XeroCell[]; Rows?: XeroRow[] };
type XeroReportResponse = { Reports?: { Rows?: XeroRow[] }[] };

type FlatRow = { title: string; cells: XeroCell[] };

function flattenDataRows(rows: XeroRow[] | undefined, acc: FlatRow[] = []): FlatRow[] {
  for (const row of rows ?? []) {
    if (row.RowType === "Row" || row.RowType === "SummaryRow") {
      acc.push({ title: (row.Cells?.[0]?.Value ?? row.Title ?? "").trim(), cells: row.Cells ?? [] });
    }
    if (row.Rows) flattenDataRows(row.Rows, acc);
  }
  return acc;
}

function cellNumber(cell: XeroCell | undefined): number {
  if (!cell?.Value) return 0;
  const n = parseFloat(cell.Value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function findRow(rows: FlatRow[], patterns: RegExp[]): FlatRow | undefined {
  for (const pattern of patterns) {
    const match = rows.find((r) => pattern.test(r.title));
    if (match) return match;
  }
  return undefined;
}

/**
 * Best-effort parse of Xero's Reports API shape into the normalized monthly
 * form profit_baseline stores. Xero's exact row titles/nesting vary by org's
 * chart of accounts, so this is defensive by design: whatever it can't find
 * comes back as zeros, never a thrown error — the UI always shows the result
 * as an editable grid before anything is saved, so a partial or wrong parse
 * is corrected by the user, not silently persisted.
 */
export function parseProfitAndLossReport(
  raw: unknown,
  fromDate: string,
  toDate: string,
): NormalizedPnL {
  const report = (raw as XeroReportResponse).Reports?.[0];
  const topRows = report?.Rows ?? [];

  const headerRow = topRows.find((r) => r.RowType === "Header");
  const periodLabels = (headerRow?.Cells ?? []).slice(1).map((c) => c.Value ?? "");

  const dataRows = flattenDataRows(topRows);

  const revenueRow = findRow(dataRows, [/^total income$/i, /^total revenue$/i, /^total sales$/i]);
  const expensesRow = findRow(dataRows, [
    /^total operating expenses$/i,
    /^total expenses$/i,
    /^less operating expenses$/i,
  ]);
  const netProfitRow = findRow(dataRows, [/^net profit$/i, /^net income$/i, /^profit for the period$/i]);

  const monthKeys = enumerateMonths(fromDate, toDate);
  const columnCount = Math.max(periodLabels.length, monthKeys.length);

  const monthly: MonthlyPnL[] = [];
  for (let i = 0; i < columnCount && i < monthKeys.length; i++) {
    const revenue = revenueRow ? cellNumber(revenueRow.cells[i + 1]) : 0;
    const expenses = expensesRow ? Math.abs(cellNumber(expensesRow.cells[i + 1])) : 0;
    const net_profit = netProfitRow ? cellNumber(netProfitRow.cells[i + 1]) : revenue - expenses;
    monthly.push({ month: monthKeys[i], revenue, expenses, net_profit });
  }

  return summarize(fromDate, toDate, monthly);
}

function enumerateMonths(fromDate: string, toDate: string): string[] {
  const start = new Date(fromDate + "T00:00:00Z");
  const end = new Date(toDate + "T00:00:00Z");
  const months: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (cursor <= end) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

export function summarize(fromDate: string, toDate: string, monthly: MonthlyPnL[]): NormalizedPnL {
  const total_revenue = round2(monthly.reduce((sum, m) => sum + m.revenue, 0));
  const total_expenses = round2(monthly.reduce((sum, m) => sum + m.expenses, 0));
  const total_net_profit = round2(monthly.reduce((sum, m) => sum + m.net_profit, 0));
  return {
    period_start: fromDate,
    period_end: toDate,
    monthly,
    total_revenue,
    total_expenses,
    total_net_profit,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function emptyTrailingTwelveMonths(): MonthlyPnL[] {
  const { fromDate, toDate } = trailingTwelveMonthRange();
  return enumerateMonths(fromDate, toDate).map((month) => ({
    month,
    revenue: 0,
    expenses: 0,
    net_profit: 0,
  }));
}
