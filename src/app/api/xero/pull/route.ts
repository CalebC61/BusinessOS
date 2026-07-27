import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidXeroAccessToken } from "@/lib/xero/client";
import {
  fetchProfitAndLossReport,
  parseProfitAndLossReport,
  trailingTwelveMonthRange,
} from "@/lib/xero/report";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const connection = await getValidXeroAccessToken(user.id);
  if (!connection) {
    return NextResponse.json({ error: "No Xero connection for this account" }, { status: 400 });
  }

  try {
    const { fromDate, toDate } = trailingTwelveMonthRange();
    const raw = await fetchProfitAndLossReport(connection.accessToken, connection.tenantId);
    const normalized = parseProfitAndLossReport(raw, fromDate, toDate);
    return NextResponse.json(normalized);
  } catch (err) {
    console.error("xero pull failed", err);
    const message = err instanceof Error ? err.message : "Xero pull failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
