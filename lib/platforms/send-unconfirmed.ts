/**
 * Creating a public post is not safe to repeat blindly: if the network drops
 * the reply, or the platform answers with a server error, the post may already
 * be live. Those cases throw SendUnconfirmed, which the publisher records as
 * "uncertain" (never retried automatically; the user checks, then Retry).
 * A request that provably never left (DNS failure, connection refused) and
 * 4xx refusals stay ordinary errors, which are retried as usual.
 */
export class SendUnconfirmed extends Error {}

const NEVER_SENT = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ERR_INVALID_URL"]);

export function unconfirmedMessage(label: string): string {
  return `${label} didn't confirm the post. Check your ${label} account before using Retry: it may have gone out.`;
}

/** POST something that publishes. Returns the response for anything below 500. */
export async function sendPublish(url: string, init: RequestInit, label: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    const code = (e as { cause?: { code?: string } })?.cause?.code;
    if (code && NEVER_SENT.has(code)) throw e;
    throw new SendUnconfirmed(unconfirmedMessage(label));
  }
  if (res.status >= 500) throw new SendUnconfirmed(unconfirmedMessage(label));
  return res;
}

/** Read a publish reply's JSON; a successful status with an unreadable body is unconfirmed. */
export async function publishJson<T>(res: Response, label: string): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    if (res.ok) throw new SendUnconfirmed(unconfirmedMessage(label));
    throw new Error(`${label} post error ${res.status}`);
  }
}
