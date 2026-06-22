import { config } from "./config.js";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let cache: TokenCache | null = null;

export async function getToken(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now + 30_000) {
    return cache.token;
  }

  const res = await fetch(config.auth0TokenUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: config.auth0ClientId,
      client_secret: config.auth0ClientSecret,
      audience: config.auth0Audience,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(`Auth0 token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cache.token;
}
