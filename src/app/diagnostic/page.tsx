import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRootNode } from "@/lib/diagnostic/tree";
import { DiagnosticWizard } from "./wizard";

export default async function DiagnosticPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const root = getRootNode();

  return (
    <DiagnosticWizard initialNodeId={root.node_id} initialQuestion={root.question} />
  );
}
