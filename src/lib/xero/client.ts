import { createClient } from "@/lib/supabase/server";

const AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const CONNECTIONS_URL = "https://api.xero.com/connections";

const SCOPES = "offline_access accounting.reports.read accounting.settings.read";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See .env.example — the Xero connector needs it.`);
  }
  return value;
}

export function getXeroAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("XERO_CLIENT_ID"),
    redirect_uri: requireEnv("XERO_REDIRECT_URI"),
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

type XeroTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

function basicAuthHeader(): string {
  const id = requireEnv("XERO_CLIENT_ID");
  const secret = requireEnv("XERO_CLIENT_SECRET");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function exchangeCodeForTokens(code: string): Promise<XeroTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: requireEnv("XERO_REDIRECT_URI"),
    }),
  });
  if (!res.ok) {
    throw new Error(`Xero token exchange failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function refreshTokens(refreshToken: string): Promise<XeroTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Xero token refresh failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export type XeroTenant = { tenantId: string; tenantName: string };

export async function getXeroConnections(accessToken: string): Promise<XeroTenant[]> {
  const res = await fetch(CONNECTIONS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Xero connections lookup failed (${res.status}): ${await res.text()}`);
  }
  const connections: { tenantId: string; tenantName: string; tenantType: string }[] =
    await res.json();
  return connections
    .filter((c) => c.tenantType === "ORGANISATION")
    .map((c) => ({ tenantId: c.tenantId, tenantName: c.tenantName }));
}

export async function saveXeroConnection(
  userId: string,
  tenant: XeroTenant,
  tokens: XeroTokenResponse,
): Promise<void> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase.from("xero_connection").upsert(
    {
      user_id: userId,
      tenant_id: tenant.tenantId,
      tenant_name: tenant.tenantName,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Failed to save Xero connection: ${error.message}`);
  }
}

export type XeroConnectionRow = {
  tenant_id: string;
  tenant_name: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export async function getXeroConnection(userId: string): Promise<XeroConnectionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("xero_connection")
    .select("tenant_id, tenant_name, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

const REFRESH_SKEW_MS = 60_000; // refresh a minute before actual expiry

/** Returns a live access token + tenant id, refreshing and persisting a new token first if the stored one is expired or about to be. */
export async function getValidXeroAccessToken(
  userId: string,
): Promise<{ accessToken: string; tenantId: string } | null> {
  const connection = await getXeroConnection(userId);
  if (!connection) return null;

  const expiresAt = new Date(connection.expires_at).getTime();
  if (Date.now() < expiresAt - REFRESH_SKEW_MS) {
    return { accessToken: connection.access_token, tenantId: connection.tenant_id };
  }

  const refreshed = await refreshTokens(connection.refresh_token);
  await saveXeroConnection(
    userId,
    { tenantId: connection.tenant_id, tenantName: connection.tenant_name ?? "" },
    refreshed,
  );
  return { accessToken: refreshed.access_token, tenantId: connection.tenant_id };
}
