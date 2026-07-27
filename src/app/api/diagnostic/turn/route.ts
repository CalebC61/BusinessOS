import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDiagnosticTurn, type HistoryTurn, type IntakeRecord } from "@/lib/diagnostic/interviewer";

type TurnRequestBody = {
  currentNodeId: string;
  latestAnswer: string;
  history: HistoryTurn[];
  priorIntakeRecord?: IntakeRecord;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<TurnRequestBody>;

  if (!body.currentNodeId || typeof body.latestAnswer !== "string" || !body.latestAnswer.trim()) {
    return NextResponse.json({ error: "currentNodeId and latestAnswer are required" }, { status: 400 });
  }

  try {
    const result = await runDiagnosticTurn({
      currentNodeId: body.currentNodeId,
      latestAnswer: body.latestAnswer,
      history: body.history ?? [],
      priorIntakeRecord: body.priorIntakeRecord ?? {},
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("diagnostic turn failed", error);
    const message = error instanceof Error ? error.message : "Diagnostic turn failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
