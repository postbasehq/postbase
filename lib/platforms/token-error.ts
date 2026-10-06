/**
 * A failed OAuth token request, with what's needed to tell "this login is
 * dead" (reconnect) from "the network is having a moment" (retry).
 */
export class TokenError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null,
  ) {
    super(message);
  }
}

/**
 * True only when the network definitively refused the refresh token (revoked,
 * expired, already used): reconnecting is the only fix. Outages, rate limits,
 * garbled responses and network errors are not — those are retried.
 */
export function isDefinitiveAuthFailure(e: unknown): boolean {
  if (!(e instanceof TokenError)) return false;
  if (e.code && ["invalid_grant", "invalid_client", "unauthorized_client", "invalid_token"].includes(e.code)) return true;
  // X reports a spent or bad refresh token as 400 invalid_request.
  return (e.status === 400 || e.status === 401) && e.code === "invalid_request";
}

/** Read a token endpoint's reply without crashing on an HTML error page. */
export async function readTokenResponse<T extends { error?: string; error_description?: string }>(
  res: Response,
  label: string,
): Promise<T> {
  const text = await res.text();
  let json: T | null = null;
  try {
    json = JSON.parse(text) as T;
  } catch {
    /* not JSON: an outage page or proxy error */
  }
  if (!res.ok || !json || json.error) {
    throw new TokenError(json?.error_description ?? json?.error ?? `${label} token error ${res.status}`, res.status, json?.error ?? null);
  }
  return json;
}
