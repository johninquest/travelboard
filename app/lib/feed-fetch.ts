// Polite HTTP for feed polling. One host at a time, one request per 2s, our own UA
// string (never impersonating Googlebot/GPTBot — that would breach the named-bot
// disallow rules in mydealz robots.txt). No dependency on the parser or the DB.

export type FetchResult = {
  status: number;
  contentType: string;
  contentSignal: string; // verbatim Content-Signal header, "" when absent
  etag: string;
  lastModified: string;
  body: string;
};

const MIN_INTERVAL_MS = 2_000;
const TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 2_000_000;

// We identify ourselves honestly and give a contact so a human can reach us.
const USER_AGENT =
  "travelboard-bot/1.0 (+https://travelboard.johnxlabs.de; contact: john@johnxlabs.de)";

const lastRequestAt = new Map<string, number>();

async function throttle(host: string): Promise<void> {
  const last = lastRequestAt.get(host) ?? 0;
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt.set(host, Date.now());
}

export async function fetchFeed(
  url: string,
  cond?: { etag?: string; lastModified?: string }
): Promise<FetchResult> {
  const u = new URL(url);
  await throttle(u.host);

  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    "Accept-Encoding": "gzip",
  };
  if (cond?.etag) headers["If-None-Match"] = cond.etag;
  if (cond?.lastModified) headers["If-Modified-Since"] = cond.lastModified;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(u, { headers, redirect: "follow", signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }

  const result: FetchResult = {
    status: res.status,
    contentType: res.headers.get("content-type") ?? "",
    contentSignal: res.headers.get("content-signal") ?? "",
    etag: res.headers.get("etag") ?? "",
    lastModified: res.headers.get("last-modified") ?? "",
    body: "",
  };
  if (res.status === 304 || !res.ok) return result;

  const text = await res.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new Error(`Feed body too large from ${u.host}: ${text.length} bytes`);
  }
  result.body = text;
  return result;
}
