import { NextResponse } from "next/server";
import { pbPublic } from "@/lib/pb";
import { recordToListing } from "@/lib/listings-read";
import { ALL_HUBS, findHub, hubFilter } from "@/lib/hubs";
import { SITE_URL as SITE } from "@/lib/site";

// Machine-readable layer for AI engines and agents (the "answerability" bet).
// Public, and deliberately NO booking_url — that stays server-side so every
// outbound click is logged. Fields are explicit facts, not prose.

export function publicOffer(l: ReturnType<typeof recordToListing>) {
  return {
    slug: l.slug,
    title: l.title,
    summary: l.summary,
    destination: l.destination,
    country: l.country,
    departure_airport: l.departureAirport,
    nights: l.nights,
    travel_window: l.travelWindow,
    price_from_eur: l.priceFromEur,
    price_per_person_eur: l.pricePerPersonEur,
    currency: l.currency,
    travellers: l.travellers,
    hotel: l.accommodation.name,
    hotel_category: l.accommodation.category,
    board: l.accommodation.board,
    themes: l.themes,
    included: l.included,
    excluded: l.excluded,
    source: l.sourceName,
    source_url: l.sourceUrl,
    page_url: `${SITE}/deal/${l.slug}`,
    last_checked: l.lastChecked,
  };
}

export async function GET() {
  const pb = pbPublic();
  const records = await pb
    .collection("travel_listings")
    .getFullList({ filter: 'status = "live"', sort: "-source_published_at", expand: "source", requestKey: null })
    .catch(() => []);
  const listings = records.map(recordToListing);
  return NextResponse.json({
    site: SITE,
    generated_at: new Date().toISOString(),
    currency: "EUR",
    count: listings.length,
    disclaimer:
      "Preise laut Anbieter zum Prüfzeitpunkt, pro Person oder als Gesamtpreis wie ausgewiesen. Kein Angebot erscheint vor redaktioneller Prüfung.",
    hubs: ALL_HUBS.map((h) => ({
      slug: h.slug,
      kind: h.kind,
      name: h.name,
      description: h.description,
      url: `${SITE}/holidays/${h.slug}`,
      api: `${SITE}/api/holidays/${h.slug}`,
    })),
    offers: listings.map(publicOffer),
  });
}

export async function hubJson(slug: string) {
  const hub = findHub(slug);
  if (!hub) return NextResponse.json({ error: "unknown hub" }, { status: 404 });
  const pb = pbPublic();
  const records = await pb
    .collection("travel_listings")
    .getFullList({ filter: hubFilter(hub), sort: "-source_published_at", expand: "source", requestKey: null })
    .catch(() => []);
  const listings = records.map(recordToListing);
  return NextResponse.json({
    hub: { slug: hub.slug, kind: hub.kind, name: hub.name, description: hub.description },
    count: listings.length,
    currency: "EUR",
    disclaimer:
      "Preise laut Anbieter zum Prüfzeitpunkt. Kein Angebot erscheint vor redaktioneller Prüfung.",
    offers: listings.map(publicOffer),
  });
}
