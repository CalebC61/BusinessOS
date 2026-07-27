import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getXeroAuthorizeUrl } from "@/lib/xero/client";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const state = randomBytes(16).toString("hex");
  let authorizeUrl: string;
  try {
    authorizeUrl = getXeroAuthorizeUrl(state);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Xero is not configured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("xero_oauth_state", state, {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
