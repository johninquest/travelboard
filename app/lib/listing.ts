// Layer-2 model for the deals board: one normalised, dated, attributable offer.
// Mirrors the Pocketbase `travel_listings` collection (see pocketbase/schema.md).
// Supplier/feed quirks stay in the JSON fields; nothing downstream re-parses them.

export type ListingStatus = "live" | "expired" | "needs_review";
export type ListingConfidence = "verified" | "feed" | "manual";

export type TravelWindow = {
  start?: string; // YYYY-MM-DD
  end?: string;
  label?: string; // human phrasing, e.g. "20 Aug - 27 Aug 2026"
};

export type Accommodation = {
  name?: string;
  category?: number; // supplier's own star/sun rating, never ours
  board?: string; // "fruehstueck" | "half board" | "all inclusive" | ...
};

export type Listing = {
  id: string;
  title: string;
  slug: string;
  summary: string; // our own wording, max 280
  destination: string;
  country: string; // ISO alpha-2
  departureAirport: string; // IATA
  nights: number | null;
  travelWindow: TravelWindow | null;
  priceFromEur: number | null;
  pricePerPersonEur: number | null;
  currency: string;
  travellers: number | null;
  accommodation: Accommodation;
  included: string[];
  excluded: string[];
  themes: string[];
  sourceId: string;
  sourceUrl: string;
  sourceGuid: string;
  sourcePublishedAt: string | null;
  bookingUrl: string; // never shipped to the client (PB view rule hides it from anon)
  affiliateNetwork: string;
  status: ListingStatus;
  confidence: ListingConfidence;
  lastChecked: string; // ISO — staleness must be visible
  notes: string;
};

export const LISTING_SELECT_VALUES = {
  status: ["live", "expired", "needs_review"],
  confidence: ["verified", "feed", "manual"],
  affiliateNetwork: ["check24", "awin", "direct", "none"],
  themes: ["beach", "all-inclusive", "city", "family", "romance", "last-minute", "ski", "cruise"],
} as const;

// A feed item is *discovery*, not a fact. It becomes `live` only once a human has
// verified the price on the source page — so feed imports default to needs_review.
export function canBeLive(l: Pick<Listing, "confidence" | "priceFromEur" | "lastChecked">): boolean {
  return l.confidence === "verified" && l.priceFromEur != null && l.lastChecked.length > 0;
}

// Hard expiry. UWG Anhang Nr. 5/6 (Lockangebot) reverses the burden of proof onto us,
// so an offer is dropped from the public board on the earliest of: travel window end,
// source max_age_days after publication, or a fixed ceiling when the window is unknown.
export function isExpired(
  l: Pick<Listing, "travelWindow" | "sourcePublishedAt">,
  sourceMaxAgeDays: number,
  now: Date = new Date()
): boolean {
  const end = l.travelWindow?.end;
  if (end) {
    const endDate = new Date(end.length === 10 ? `${end}T23:59:59Z` : end);
    if (!Number.isNaN(endDate.getTime()) && endDate < now) return true;
  }
  if (l.sourcePublishedAt) {
    const pub = new Date(l.sourcePublishedAt);
    if (!Number.isNaN(pub.getTime())) {
      const ceilingMs = Math.min(sourceMaxAgeDays, 30) * 86_400_000;
      if (now.getTime() - pub.getTime() > ceilingMs) return true;
    }
  }
  return false;
}

export function listingSlug(title: string, destination: string, publishedAt: string | null): string {
  const base = [destination, title].filter(Boolean).map(slugify).filter(Boolean).join("-");
  const date = publishedAt?.slice(0, 10).replaceAll("-", "");
  const slug = date ? `${base}-${date}`.slice(0, 120) : base.slice(0, 120);
  return slug.replace(/-+$/g, "");
}

// German-aware, lowercase, ASCII-only, hyphenated. Used for URLs, never for display.
export function slugify(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[äàáâ]/g, "a")
    .replace(/[öòóô]/g, "o")
    .replace(/[üùúû]/g, "u")
    .replace(/[ß]/g, "ss")
    .replace(/[èéê]/g, "e")
    .replace(/[ìíî]/g, "i")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function eur(n: number): string {
  return `€${n.toLocaleString("de-DE")}`;
}

// PAngV 3(1): a price is never shown as a bare number. This is the Gesamtpreis +
// exclusions statement that sits under every price on the board.
export function priceStatement(
  l: Pick<Listing, "priceFromEur" | "pricePerPersonEur" | "travellers" | "included" | "excluded" | "currency">
): string {
  if (l.priceFromEur == null) return "Kein Preis angegeben — bitte den Preis direkt beim Anbieter prüfen.";
  const cur = l.currency || "EUR";
  const parts = [`Ab ${eur(l.priceFromEur)} ${cur} laut Anbieter`];
  if (l.pricePerPersonEur != null) {
    parts.push(`= ${eur(l.pricePerPersonEur)} pro Person bei ${l.travellers ?? 2} Reisenden`);
  }
  if (l.included.length) parts.push(`Enthalten: ${l.included.join(", ")}`);
  parts.push(l.excluded.length ? `Nicht enthalten: ${l.excluded.join(", ")}` : "Nicht alle Zusatzkosten sind ausgewiesen — Gesamtpreis beim Anbieter prüfen");
  return parts.join(". ") + ".";
}
