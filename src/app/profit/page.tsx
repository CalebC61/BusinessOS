import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emptyTrailingTwelveMonths } from "@/lib/xero/report";
import { ProfitBaselineEditor } from "./editor";

type SearchParams = Promise<{ connected?: string; error?: string }>;

export default async function ProfitBaselinePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { connected, error } = await searchParams;

  const { data: connection } = await supabase
    .from("xero_connection")
    .select("tenant_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <ProfitBaselineEditor
      xeroConnected={Boolean(connection)}
      tenantName={connection?.tenant_name ?? null}
      justConnected={connected === "1"}
      connectError={error ?? null}
      initialMonthly={emptyTrailingTwelveMonths()}
    />
  );
}
