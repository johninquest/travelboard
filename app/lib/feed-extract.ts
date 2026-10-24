// Turns a feed item into a draft listing row. Facts are extracted from the *visible text*
// only (title + description), because the deal pages themselves are JS-rendered and give
// nothing to a plain fetch.
//
// Extraction is conservative by design: anything we cannot read out of the text stays null
// and is filled in by a human. The one thing we never do is invent a number — a price we
// cannot point at in the source text is no price at all.

import type { FeedItem } from "./rss.ts";
import { stripTags } from "./rss.ts";
import { LISTING_SELECT_VALUES, listingSlug, slugify } from "./listing.ts";

export type DraftListing = {
  title: string;
  slug: string;
  summary: string;
  destination: string;
  country: string;
  departure_airport: string;
  nights: number | null;
  travel_window: { start?: string; end?: string; label?: string } | null;
  price_from_eur: number | null;
  price_pp_eur: number | null;
  currency: string;
  travellers: number | null;
  accommodation: { name?: string; category?: number; board?: string };
  included: string[];
  excluded: string[];
  themes: string[];
  source_url: string;
  source_guid: string;
  source_published_at: string | null;
  booking_url: string;
  affiliate_network: string;
  status: string;
  confidence: string;
  last_checked: string;
  notes: string;
};

// Departure airports we actually serve. Add to this list, do not guess: an unknown
// airport stays null rather than being inferred from a stray three-letter token.
export const AIRPORTS = ["MUC", "NUE", "STR", "FRA", "BER", "HAM", "DUS", "CGN", "LEJ", "VIE", "ZRH", "GVA", "MIL", "FCO", "NAP", "BLQ", "VCE"];

// German + a little English, because feeds mix them.
const BOARD_TERMS: Array<[string, string]> = [
  ["all inclusive", "all inclusive"],
  ["all-inclusive", "all inclusive"],
  ["ultra all inclusive", "ultra all inclusive"],
  ["halbpension", "half board"],
  ["half board", "half board"],
  ["fruehstueck", "breakfast"],
  ["frühstück", "breakfast"],
  ["breakfast", "breakfast"],
  ["ohne verpflegung", "room only"],
  ["room only", "room only"],
  ["self catering", "self catering"],
  ["uebernachtung mit fruehstueck", "breakfast"],
];

const THEME_TERMS: Array<[string, string]> = [
  ["all inclusive", "all-inclusive"],
  ["all-inclusive", "all-inclusive"],
  ["staedtereise", "city"],
  ["städtereise", "city"],
  ["city break", "city"],
  ["familienurlaub", "family"],
  ["family", "family"],
  ["kinder", "family"],
  ["honeymoon", "romance"],
  ["romantik", "romance"],
  ["last minute", "last-minute"],
  ["lastminute", "last-minute"],
  ["skireise", "ski"],
  ["skipass", "ski"],
  ["kreuzfahrt", "cruise"],
  ["cruise", "cruise"],
  ["strand", "beach"],
  ["beach", "beach"],
  ["badestr", "beach"],
];

// The regexes match German *and* English spellings because the feeds are German;
// the display name is English because the site is. First match wins, so the more
// specific patterns stay above the broader ones.
const DESTINATIONS: Array<[RegExp, string, string]> = [
  [/malle?orca|mallorca|malloca/i, "Mallorca", "ES"],
  [/kreta|crete|heraklion|chania/i, "Crete", "GR"],
  [/kos\b/i, "Kos", "GR"],
  [/rhodos|rodos/i, "Rhodes", "GR"],
  [/korfu|corfu/i, "Corfu", "GR"],
  [/sant(orini)?ini|santorin/i, "Santorini", "GR"],
  [/mykonos/i, "Mykonos", "GR"],
  [/chalkidiki|chalcidiki/i, "Halkidiki", "GR"],
  [/antalya|alanya|Side\b|Kemer/i, "Turkish Riviera", "TR"],
  [/bodrum/i, "Bodrum", "TR"],
  [/izmir|cesme/i, "Izmir", "TR"],
  [/fethiye|oludeniz/i, "Fethiye", "TR"],
  [/lanzarote/i, "Lanzarote", "ES"],
  [/fuerteventura/i, "Fuerteventura", "ES"],
  [/tenerif[ae]/i, "Tenerife", "ES"],
  [/gran ?canaria/i, "Gran Canaria", "ES"],
  [/ibiza/i, "Ibiza", "ES"],
  [/costa blanca|valencia|alicante|benidorm/i, "Costa Blanca", "ES"],
  [/costa dorada/i, "Costa Dorada", "ES"],
  [/andalusien|andalusia/i, "Andalusia", "ES"],
  [/algarve/i, "Algarve", "PT"],
  [/lissabon|lisbon/i, "Lisbon", "PT"],
  [/madeira/i, "Madeira", "PT"],
  [/azoren|azores/i, "Azores", "PT"],
  [/sardinien|sardegna|sardinia/i, "Sardinia", "IT"],
  [/sizilien|sicily|sicilia/i, "Sicily", "IT"],
  [/puglia|apulien/i, "Puglia", "IT"],
  [/toskana|tuscany/i, "Tuscany", "IT"],
  [/gardasee|lake garda/i, "Lake Garda", "IT"],
  [/rimini/i, "Rimini", "IT"],
  [/zypern|cyprus|paphos|ayia napa/i, "Cyprus", "CY"],
  [/malta/i, "Malta", "MT"],
  [/gozo/i, "Gozo", "MT"],
  [/dubrovnik|kroatien|croatia/i, "Croatia", "HR"],
  [/split\b/i, "Split", "HR"],
  [/zadar/i, "Zadar", "HR"],
  [/istrien|istria/i, "Istria", "HR"],
  [/schwarzwald|black forest/i, "Black Forest", "DE"],
  [/ostsee|baltic sea/i, "Baltic Sea", "DE"],
  [/nordsee|north sea/i, "North Sea", "DE"],
  [/harz/i, "Harz", "DE"],
  [/bayern|bavaria/i, "Bavaria", "DE"],
  [/tirol|tyrol/i, "Tyrol", "AT"],
  [/salzburger|kärnten|carinthia/i, "Austria", "AT"],
  [/tunesien|tunisia/i, "Tunisia", "TN"],
  [/marokko|morocco/i, "Morocco", "MA"],
  [/[aä]gypten|egypt/i, "Egypt", "EG"],
  [/kanaren|canary islands/i, "Canary Islands", "ES"],
];

const KNOWN_COUNTRIES = new Set(["ES", "GR", "TR", "PT", "IT", "CY", "MT", "HR", "DE", "AT", "FR", "NL", "CH", "SI", "ME", "AL", "BG", "HU", "PL", "CZ", "DK", "SE", "NO", "FI", "IS", "GB", "IE", "MA", "TN", "EG", "US", "TH", "AE"]);

export function isEuropean(code: string): boolean {
  return KNOWN_COUNTRIES.has(code) && !["US", "TH", "AE", "MA", "TN", "EG", "GB", "IE"].includes(code);
}

// "ab 399€", "399 €", "ab € 449 pro Person", "349,- €", "1.299 Euro"
export function extractPriceEur(text: string): number | null {
  const NUM = "(?:[0-9]{1,3}(?:\\.[0-9]{3})+|[0-9]{2,6}(?:,[0-9]{1,2})?)";
  const CUR = "(?:\\u20ac|euros?\\b)";
  const re = new RegExp(`${CUR}\\s*(${NUM})(?:\\s*,-)?|(${NUM})(?:\\s*,-)?\\s*${CUR}`, "gi");
  let m: RegExpExecArray | null;
  const candidates: number[] = [];
  while ((m = re.exec(text)) !== null) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const n = toNumber(raw);
    if (Number.isFinite(n) && n >= 40 && n <= 20000) candidates.push(Math.round(n));
  }
  if (!candidates.length) return null;
  return Math.min(...candidates);
}

// "1.299" is one thousand two hundred ninety-nine; "1299,50" is 1299.5.
function toNumber(raw: string): number {
  if (/^[0-9]{1,3}(?:\.[0-9]{3})+$/.test(raw)) {
    return Number.parseInt(raw.replace(/\./g, ""), 10);
  }
  return Math.round(Number.parseFloat(raw.replace(",", ".")));
}

// "7 Nächte", "5 ÜN", "4 nights"
export function extractNights(text: string): number | null {
  const m = /([0-9]{1,2})\s*(?:nächte|naechte|nights|ÜN\b|uebernachtungen)/i.exec(text);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return n >= 1 && n <= 30 ? n : null;
}

// "2 Personen", "für 2", "p.P."
export function extractTravellers(text: string): number | null {
  const m = /([0-9]{1,2})\s*(?:personen|people|reisende|p\.?\s*person)/i.exec(text);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return n >= 1 && n <= 9 ? n : null;
}

// "4,5 Sterne", "5-Sterne-Hotel", "4 Sonnen", "4-Sterne"
export function extractCategory(text: string): number | null {
  const m = /([1-5])(?:[.,]([0-9]))?\s*(?:-?\s*(?:sterne|stars|sonnen))\b/i.exec(text);
  if (!m) return null;
  const n = Number.parseFloat(`${m[1]}.${m[2] ?? "0"}`);
  return n >= 1 && n <= 5 ? n : null;
}

export function extractBoard(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [term, label] of BOARD_TERMS) if (lower.includes(term.toLowerCase())) return label;
  return null;
}

export function extractThemes(text: string): string[] {
  const lower = text.toLowerCase();
  const out = new Set<string>();
  for (const [term, theme] of THEME_TERMS) if (lower.includes(term)) out.add(theme);
  return [...out].filter((t) => (LISTING_SELECT_VALUES.themes as readonly string[]).includes(t)).slice(0, 8);
}

export function extractAirport(text: string): string | null {
  for (const code of AIRPORTS) {
    if (new RegExp(`\\b${code}\\b`).test(text)) return code;
  }
  return null;
}

// "20.08. - 27.08.2026", "15. - 22.06.", "ab dem 3.9.26 für 7 Nächte"
export function extractWindow(text: string, publishedAt: string | null): DraftListing["travel_window"] {
  const re = /([0-3]?\d)\.([0-3]?\d)\.?\s*(?:20)?(\d{2})?\s*(?:-|–|bis)\s*(?:dem\s*)?([0-3]?\d)\.([0-3]?\d)\.?\s*(?:20)?(\d{2,4})?/i;
  const m = re.exec(text);
  if (!m) return null;
  const yearDefault = publishedAt ? publishedAt.slice(0, 4) : String(new Date().getFullYear());
  const toIso = (d: string, mo: string, y: string | undefined) => {
    const year = y ? (y.length === 2 ? `20${y}` : y) : yearDefault;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };
  const start = toIso(m[1], m[2], m[3]);
  const end = toIso(m[4], m[5], m[6]);
  if (!validIso(start) || !validIso(end)) return null;
  // A window that ends before it starts is a mis-parse, not a deal.
  if (end < start) return null;
  return { start, end, label: `${m[1]}.${m[2]}. – ${m[4]}.${m[5]}.` };
}

function validIso(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [, y, mo, d] = m;
  const yi = Number(y);
  return yi >= 2020 && yi <= 2100 && Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31;
}

export function destinationFrom(text: string): { destination: string; country: string } | null {
  for (const [re, name, code] of DESTINATIONS) {
    if (!name) continue;
    if (re.test(text)) return { destination: name, country: code };
  }
  return null;
}

// Booking page: prefer a link on an operator domain, else the feed item's own page.
export function bookingUrlFrom(item: FeedItem, extraLinks: string[]): string {
  return extraLinks[0] ?? item.link;
}

// Feed items arrive unreviewed. `status` stays needs_review until a human verifies the
// price, so nothing machine-extracted can be advertised as a firm Gesamtpreis.
export function draftFromFeed(item: FeedItem, now: Date = new Date()): DraftListing {
  const text = `${item.title}\n${stripTags(item.rawDescription)}`;
  const dest = destinationFrom(text);
  const price = extractPriceEur(text);
  const travellers = extractTravellers(text);
  const window = extractWindow(text, item.publishedAt);
  const themes = extractThemes(text);
  const board = extractBoard(text);

  const destination = dest?.destination ?? titleDestination(item.title);
  const country = dest?.country ?? "";
  const nights = extractNights(text);

  const summaryBits = [
    destination || null,
    nights ? `${nights} nights` : null,
    board ? board : null,
    price ? `from €${price}` : "check price",
  ].filter(Boolean);

  return {
    title: item.title.slice(0, 200),
    slug: listingSlug(item.title, destination, item.publishedAt),
    summary: summaryBits.join(" · ").slice(0, 280),
    destination,
    country,
    departure_airport: extractAirport(text) ?? "",
    nights,
    travel_window: window,
    price_from_eur: price,
    price_pp_eur: price && travellers && travellers > 1 ? Math.round(price / travellers) : price,
    currency: "EUR",
    travellers,
    accommodation: { category: extractCategory(text) ?? undefined, board: board ?? undefined },
    included: board ? [board] : [],
    excluded: [],
    themes,
    source_url: item.link,
    source_guid: item.guid.slice(0, 255),
    source_published_at: item.publishedAt,
    booking_url: bookingUrlFrom(item, []),
    affiliate_network: "none",
    status: "needs_review",
    confidence: "feed",
    last_checked: now.toISOString(),
    notes: "Imported from feed. Extracted fields are unverified — check the price and dates on the source page before publishing.",
  };
}

// "Last Minute: 7 Nächte All Inclusive auf Kreta" -> "Kreta"
function titleDestination(title: string): string {
  const m = /\b(?:auf|in|nach|on)\s+([A-ZÄÖÜ][\wÀ-ÿ-]{2,20})/.exec(title);
  return m ? m[1] : "";
}

export function normalizeSlugPart(s: string): string {
  return slugify(s);
}
