import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getXeroConnections, saveXeroConnection } from "@/lib/xero/client";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const storedState = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("xero_oauth_state="))
    ?.split("=")[1];

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/profit?error=xero_state_mismatch", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const tenants = await getXeroConnections(tokens.access_token);
    const tenant = tenants[0];

    if (!tenant) {
      return NextResponse.redirect(new URL("/profit?error=xero_no_organisation", request.url));
    }

    await saveXeroConnection(user.id, tenant, tokens);
  } catch (err) {
    console.error("xero callback failed", err);
    return NextResponse.redirect(new URL("/profit?error=xero_connect_failed", request.url));
  }

  const response = NextResponse.redirect(new URL("/profit?connected=1", request.url));
  response.cookies.delete("xero_oauth_state");
  return response;
}
