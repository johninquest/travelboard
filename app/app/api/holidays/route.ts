import { NextResponse } from "next/server";
import { getHubListings, getLiveListings } from "@/lib/store";
import { ALL_HUBS, findHub } from "@/lib/hubs";
import type { Listing } from "@/lib/listing";
import { SITE_URL as SITE } from "@/lib/site";

// Machine-readable layer for AI engines and agents (the "answerability" bet).
// Public, and deliberately NO booking_url — that stays server-side so every
// outbound click is logged. Fields are explicit facts, not prose.

export function publicOffer(l: Listing) {
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
  const listings = await getLiveListings().catch(() => []);
  return NextResponse.json({
    site: SITE,
    generated_at: new Date().toISOString(),
    currency: "EUR",
    count: listings.length,
    disclaimer:
      "Prices as stated by the supplier at the time we checked, per person or as a total where stated. No offer appears before editorial review.",
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
  const listings = await getHubListings(hub).catch(() => []);
  return NextResponse.json({
    hub: { slug: hub.slug, kind: hub.kind, name: hub.name, description: hub.description },
    count: listings.length,
    currency: "EUR",
    disclaimer:
      "Prices as stated by the supplier at the time we checked. No offer appears before editorial review.",
    offers: listings.map(publicOffer),
  });
}
