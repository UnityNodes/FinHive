import "server-only";
import { getEnv } from "./env";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

export async function ledgerToken(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.token;
  }

  const e = getEnv();
  const res = await fetch(e.AUTH0_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: e.AUTH0_M2M_CLIENT_ID,
      client_secret: e.AUTH0_M2M_CLIENT_SECRET,
      audience: e.AUTH0_AUDIENCE,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Auth0 token fetch failed ${res.status}: ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  };

  return cache.token;
}
