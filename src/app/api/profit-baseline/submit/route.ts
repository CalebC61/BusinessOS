import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { summarize, type MonthlyPnL } from "@/lib/xero/report";

type SubmitBody = {
  source: "xero" | "manual";
  monthly: MonthlyPnL[];
};

function isValidMonthly(monthly: unknown): monthly is MonthlyPnL[] {
  return (
    Array.isArray(monthly) &&
    monthly.length > 0 &&
    monthly.every(
      (m) =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as MonthlyPnL).month === "string" &&
        /^\d{4}-\d{2}$/.test((m as MonthlyPnL).month) &&
        typeof (m as MonthlyPnL).revenue === "number" &&
        typeof (m as MonthlyPnL).expenses === "number" &&
        typeof (m as MonthlyPnL).net_profit === "number",
    )
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<SubmitBody>;

  if (
    (body.source !== "xero" && body.source !== "manual") ||
    !isValidMonthly(body.monthly)
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const monthly = body.monthly;
  const summary = summarize(monthly[0].month + "-01", monthly[monthly.length - 1].month + "-01", monthly);

  const { error } = await supabase.from("profit_baseline").insert({
    user_id: user.id,
    source: body.source,
    trailing_12mo_pnl: summary,
  });

  if (error) {
    console.error("profit_baseline insert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, summary });
}
