// Server-side reads for the public board. Only `live` listings are ever visible to
// anon (Pocketbase view rule enforces this; the filter here is belt-and-braces so a
// draft can never leak even if the rule is misconfigured).

import { pbPublic } from "./pb";
import { recordToListing } from "./listings-read";
import type { Listing } from "./listing";

export type BoardFilter = {
  country?: string;
  airport?: string;
  theme?: string;
  maxPrice?: number;
};

export async function getLiveListings(filter: BoardFilter = {}): Promise<Listing[]> {
  const pb = pbPublic();
  const parts = ['status = "live"'];
  if (filter.country) parts.push(`country = "${escape(filter.country)}"`);
  if (filter.airport) parts.push(`departure_airport = "${escape(filter.airport)}"`);
  if (filter.theme) parts.push(`themes ~ "${escape(filter.theme)}"`);
  if (filter.maxPrice != null) parts.push(`price_from_eur <= ${Math.round(filter.maxPrice)}`);

  const records = await pb
    .collection("travel_listings")
    .getFullList({
      filter: parts.join(" && "),
      sort: "-source_published_at",
      expand: "source",
      requestKey: null,
    });
  return records.map(recordToListing);
}

export async function getLiveListingBySlug(slug: string): Promise<Listing | null> {
  const pb = pbPublic();
  const rec = await pb
    .collection("travel_listings")
    .getFirstListItem(`status = "live" && slug = "${escape(slug)}"`, { expand: "source", requestKey: null })
    .catch(() => null);
  return rec ? recordToListing(rec) : null;
}

function escape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
