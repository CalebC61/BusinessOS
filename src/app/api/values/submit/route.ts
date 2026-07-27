import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValuesDeck } from "@/lib/scales/definitions";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<{ values: string[] }>;
  const deck = getValuesDeck();
  const validIds = new Set(deck.cards.map((c) => c.id));

  const values = body.values;
  const isValid =
    Array.isArray(values) &&
    values.length === deck.pick_count &&
    new Set(values).size === deck.pick_count &&
    values.every((v) => validIds.has(v));

  if (!isValid) {
    return NextResponse.json(
      { error: `Pick exactly ${deck.pick_count} distinct values from the deck` },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("user_values").insert({
    user_id: user.id,
    values,
  });

  if (error) {
    console.error("user_values insert failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
