import https from "node:https";
import dns from "node:dns";
import net from "node:net";

/*
 * Download a file from a URL a caller gave us (the API's media_urls), without
 * letting that URL point our server at internal addresses (SSRF). https only,
 * no credentials or custom ports, and the address the socket actually connects
 * to must be public: checked in the DNS lookup the connection itself uses, so a
 * name can't resolve to a public IP for a check and a private one for the
 * fetch (DNS rebinding). Redirects are followed by hand, each hop re-checked.
 * The body is capped while streaming (Content-Length can lie or be missing).
 */

/** False for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPublicIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPublicIp(v.slice(7));
    return !(v === "::1" || v === "::" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v));
  }
  const [a, b] = ip.split(".").map(Number);
  return !(
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

/** Why `raw` isn't a URL we'll fetch, or null if it is. */
export function urlProblem(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "isn't a valid URL";
  }
  if (url.protocol !== "https:") return "must be an https:// URL";
  if (url.username || url.password) return "can't include a username or password";
  if (url.port && url.port !== "443") return "can't use a custom port";
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (net.isIP(host)) return isPublicIp(host) ? null : "points at a private address";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || /\.(internal|local|localhost|lan|home|corp|intranet)$/.test(host)) {
    return "points at a private address";
  }
  return null;
}

// Resolves like the default lookup, but fails the connection if any address isn't public.
const publicOnlyLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 0);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || !list.every((a) => isPublicIp(a.address))) {
      return callback(Object.assign(new Error("points at a private address"), { code: "EPRIVATE" }), "", 0);
    }
    if ((options as dns.LookupOptions).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

export type Downloaded = { bytes: Buffer; type: string; finalUrl: string };

/** GET `raw` over public https, up to `maxBytes`, following at most 3 redirects. */
export async function downloadPublic(raw: string, opts: { maxBytes: number; timeoutMs?: number }): Promise<Downloaded> {
  let current = raw;
  for (let hop = 0; hop <= 3; hop++) {
    const problem = urlProblem(current);
    if (problem) throw new Error(`The URL ${problem}.`);
    const res = await getOnce(current, opts.maxBytes, opts.timeoutMs ?? 50_000);
    if ("redirect" in res) {
      current = new URL(res.redirect, current).toString();
      continue;
    }
    return { ...res, finalUrl: current };
  }
  throw new Error("The URL redirected too many times.");
}

function getOnce(
  url: string,
  maxBytes: number,
  timeoutMs: number,
): Promise<{ redirect: string } | { bytes: Buffer; type: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { lookup: publicOnlyLookup, timeout: timeoutMs, headers: { "user-agent": "Postbase-Media/1.0" } }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        return resolve({ redirect: res.headers.location });
      }
      if (status < 200 || status >= 300) {
        res.resume();
        return reject(new Error(`Couldn't download the file (HTTP ${status}).`));
      }
      const declared = Number(res.headers["content-length"] ?? 0);
      if (declared > maxBytes) {
        res.destroy();
        return reject(new Error(`The file is too large (max ${Math.round(maxBytes / 1048576)} MB).`));
      }
      const chunks: Buffer[] = [];
      let total = 0;
      res.on("data", (c: Buffer) => {
        total += c.length;
        if (total > maxBytes) {
          res.destroy();
          reject(new Error(`The file is too large (max ${Math.round(maxBytes / 1048576)} MB).`));
          return;
        }
        chunks.push(c);
      });
      res.on("end", () => {
        const type = String(res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
        resolve({ bytes: Buffer.concat(chunks), type });
      });
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("Downloading the file timed out.")));
    req.on("error", (e: NodeJS.ErrnoException) =>
      reject(e.code === "EPRIVATE" ? new Error("The URL points at a private address.") : new Error(`Couldn't download the file (${e.message}).`)),
    );
  });
}
