import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONSTRAINT_MODULES, type ConstraintModule } from "@/lib/diagnostic/tree";
import type { IntakeRecord } from "@/lib/diagnostic/interviewer";

type CompleteRequestBody = {
  intakeRecord: IntakeRecord;
  constraintModule: ConstraintModule;
  constraintConfidence: number;
  rockStatement: string;
};

function isConstraintModule(value: unknown): value is ConstraintModule {
  return typeof value === "string" && (CONSTRAINT_MODULES as readonly string[]).includes(value);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<CompleteRequestBody>;

  if (
    !body.rockStatement?.trim() ||
    !isConstraintModule(body.constraintModule) ||
    typeof body.constraintConfidence !== "number"
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const intakeRecord = body.intakeRecord ?? {};

  const { data: intake, error: intakeError } = await supabase
    .from("diagnostic_intake")
    .insert({
      user_id: user.id,
      business_model: intakeRecord.business_model ?? null,
      offer: intakeRecord.offer ?? null,
      pricing: intakeRecord.pricing ?? null,
      ttm_revenue: intakeRecord.ttm_revenue ?? null,
      lead_sources: intakeRecord.lead_sources ?? null,
      hours_breakdown: intakeRecord.hours_breakdown ?? null,
      what_tried: intakeRecord.what_tried ?? null,
      constraint_hypothesis: body.constraintModule,
      constraint_confidence: body.constraintConfidence,
    })
    .select("id")
    .single();

  if (intakeError) {
    console.error("diagnostic_intake insert failed", intakeError);
    return NextResponse.json({ error: intakeError.message }, { status: 500 });
  }

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 90);

  const { data: cycle, error: cycleError } = await supabase
    .from("cycle")
    .insert({
      user_id: user.id,
      start_date: startDate.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10),
      billing_status: "unbilled",
    })
    .select("id")
    .single();

  if (cycleError) {
    console.error("cycle insert failed", cycleError);
    return NextResponse.json({ error: cycleError.message }, { status: 500 });
  }

  const { data: rock, error: rockError } = await supabase
    .from("rock")
    .insert({
      cycle_id: cycle.id,
      statement: body.rockStatement.trim(),
      constraint_module: body.constraintModule,
      status: "approved",
    })
    .select("id")
    .single();

  if (rockError) {
    console.error("rock insert failed", rockError);
    return NextResponse.json({ error: rockError.message }, { status: 500 });
  }

  return NextResponse.json({ diagnosticIntakeId: intake.id, cycleId: cycle.id, rockId: rock.id });
}
