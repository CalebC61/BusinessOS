import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scoreInstrument } from "@/lib/scales/scoring";
import type { Instrument } from "@/lib/scales/definitions";

const VALID_INSTRUMENTS: Instrument[] = ["who5", "ngse", "ips"];
const VALID_CYCLE_DAYS = [0, 45, 90];

type SubmitBody = {
  instrument: Instrument;
  responses: number[];
  cycle_day: number;
};

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
    !body.instrument ||
    !VALID_INSTRUMENTS.includes(body.instrument) ||
    !Array.isArray(body.responses) ||
    typeof body.cycle_day !== "number" ||
    !VALID_CYCLE_DAYS.includes(body.cycle_day)
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let result;
  try {
    result = scoreInstrument(body.instrument, body.responses);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid responses";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error } = await supabase.from("scale_administration").insert({
    user_id: user.id,
    instrument: body.instrument,
    responses: body.responses,
    score: result.score,
    cycle_day: body.cycle_day,
    floor_policy_triggered: result.floor_policy_triggered,
  });

  if (error) {
    console.error("scale_administration insert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(result);
}
