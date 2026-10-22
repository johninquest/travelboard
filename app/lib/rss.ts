// Minimal RSS 2.0 / Atom reader. Deliberately hand-rolled (~120 lines) instead of
// pulling in a dependency: we only ever read a handful of text fields, and a real XML
// parser is the wrong tool for feeds that are machine-generated but not always valid.
//
// This module does NO I/O. Fetching lives in lib/feed-fetch.ts so the whole pipeline can
// be tested against fixtures without touching the network.

export type FeedItem = {
  guid: string;
  title: string;
  link: string;
  publishedAt: string | null; // ISO 8601 UTC, null if unparseable
  rawDescription: string; // HTML — never rendered as-is, only parsed for facts
};

export type Feed = {
  title: string;
  items: FeedItem[];
};

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  euro: "€",
  eacute: "é",
  auml: "ä",
  ouml: "ö",
  uuml: "ü",
  szlig: "ß",
  ndash: "–",
  mdash: "—",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, body: string) => {
    if (body[0] === "#") {
      const hex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    const named = NAMED[body] ?? NAMED[body.toLowerCase()];
    return named ?? m;
  });
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|ul|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*/g, "\n\n")
    .trim();
}

function unCdata(s: string): string {
  return s.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1");
}

// Returns the inner text of the first `<name ...>` element found in `block`.
// Attribute-only forms (`<link href="..."/>`) return "" — callers handle that.
function firstText(block: string, name: string): string | null {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const m = re.exec(block);
  if (!m) {
    const self = new RegExp(`<${name}([^>]*)/>`, "i").exec(block);
    if (!self) return null;
    const href = /\shref\s*=\s*["']([^"']+)["']/i.exec(self[1]);
    return href ? href[1] : "";
  }
  return unCdata(m[1]).trim();
}

// RFC 822 (RSS pubDate) and RFC 3339 (Atom) both land here.
export function parseDate(value: string | null): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}

export function parseFeed(xml: string): Feed {
  const title = firstText(xml, "title") ?? "";
  const blocks = [
    ...allBlocks(xml, "item"), // RSS 2.0
    ...allBlocks(xml, "entry"), // Atom
  ];

  const items: FeedItem[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    const link = firstText(block, "link") ?? "";
    const itemTitle = stripTags(firstText(block, "title") ?? "");
    const guid = stripTags(firstText(block, "guid") ?? "") || stripTags(firstText(block, "id") ?? "") || link;
    if (!link || !itemTitle || !guid) continue; // unusable without a destination page

    const iso =
      parseDate(firstText(block, "pubDate")) ??
      parseDate(firstText(block, "published")) ??
      parseDate(firstText(block, "updated"));

    const description = firstText(block, "description") ?? firstText(block, "content") ?? firstText(block, "summary") ?? "";

    const key = guid;
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ guid, title: itemTitle, link, publishedAt: iso, rawDescription: description });
  }

  return { title: stripTags(title), items };
}

function allBlocks(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1]);
  return out;
}

// Per-item links inside the description (e.g. an operator booking page embedded by the
// feed). We only take absolute http(s) URLs.
export function linksIn(html: string): string[] {
  const re = /<a[^>]*\shref\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(decodeEntities(m[1]));
  return [...new Set(out)];
}
