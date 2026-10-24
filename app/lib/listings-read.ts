// Server-only mapping of the anon-visible travel_listings record into the typed
// Listing model. booking_url is deliberately NOT exposed here — it is resolved
// server-side when the CTA is clicked, never shipped in the client payload.

import type { Accommodation, Listing, TravelWindow } from "./listing";

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function jsonAs<T>(v: unknown, fallback: T): T {
  return v != null && typeof v === "object" ? (v as T) : fallback;
}

export function recordToListing(rec: Record<string, unknown>): Listing {
  const expanded = rec["source"] as Record<string, unknown> | undefined;
  return {    id: str(rec.id),
    title: str(rec.title),
    slug: str(rec.slug),
    summary: str(rec.summary),
    destination: str(rec.destination),
    country: str(rec.country),
    departureAirport: str(rec.departure_airport),
    nights: num(rec.nights),
    travelWindow: rec.travel_window ? jsonAs<TravelWindow>(rec.travel_window, {}) : null,
    priceFromEur: num(rec.price_from_eur),
    pricePerPersonEur: num(rec.price_pp_eur),
    currency: str(rec.currency, "EUR"),
    travellers: num(rec.travellers),
    accommodation: jsonAs<Accommodation>(rec.accommodation, {}),
    included: Array.isArray(rec.included) ? (rec.included as unknown[]).map((x) => str(x)).filter(Boolean) : [],
    excluded: Array.isArray(rec.excluded) ? (rec.excluded as unknown[]).map((x) => str(x)).filter(Boolean) : [],
    themes: Array.isArray(rec.themes) ? (rec.themes as unknown[]).map((x) => str(x)).filter(Boolean) : [],
    sourceId: str(expanded?.id ?? rec.source),
    sourceUrl: str(rec.source_url),
    sourceGuid: str(rec.source_guid),
    sourcePublishedAt: str(rec.source_published_at, null as unknown as string) || null,
    bookingUrl: "", // never client-visible; see lib/store.ts getClickTarget()
    affiliateNetwork: str(rec.affiliate_network, "none"),
    status: (str(rec.status, "needs_review") as Listing["status"]) ?? "needs_review",
    confidence: (str(rec.confidence, "feed") as Listing["confidence"]) ?? "feed",
    lastChecked: str(rec.last_checked),
    notes: str(rec.notes),
    sourceName: str(expanded?.name),
    sourceAttributionUrl: str(expanded?.attribution_url),
  };
}

export function expandSource(rec: Record<string, unknown>): { name: string; attribution_url: string } {
  const src = rec["source"] as Record<string, unknown> | undefined;
  return {
    name: src ? str(src.name) : "",
    attribution_url: src ? str(src.attribution_url) : "",
  };
}
