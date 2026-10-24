// The board's storage layer. Everything that reads offers goes through here, so
// the storage engine is an implementation detail of this one file.
//
// Today the store is two committed JSON files:
//   data/listings.json   — the curated board (only `live` rows are ever shown)
//   data/sources.json    — the feed sources the ingest worker polls
//   data/candidates.json — needs_review drafts written by `npm run ingest`
//
// They are imported statically, so the data is bundled at build time: the board
// renders its facts in the initial HTML with no database, no credentials and no
// network. Publishing a change is a commit + deploy, which is the right trade for
// a hand-curated board of a few dozen offers. When that stops being true (roughly
// >50 live offers, or a second curator, or click volume a log line can't carry),
// swap the bodies of these functions for a real database — nothing outside this
// file needs to change.

import listingsJson from "@/data/listings.json";
import sourcesJson from "@/data/sources.json";
import candidatesJson from "@/data/candidates.json";
import { recordToListing } from "./listings-read";
import { isExpired, type Listing } from "./listing";
import { hubMatches, type HubDef } from "./hubs";

export type BoardFilter = {
  country?: string;
  airport?: string;
  theme?: string;
  maxPrice?: number;
};

export type SourceRecord = {
  slug: string;
  name: string;
  kind: string;
  feed_url: string;
  robots_url: string;
  content_signal: string;
  attribution_url: string;
  allowed: boolean;
  max_age_days: number;
  note: string;
};

// The JSON files are authored by hand, so their inferred types are useless
// (`[]` infers as `never[]`). Treat them as untyped records and let
// recordToListing do the validating — it already coerces every field.
//
// Shape is checked at import time on purpose. Callers wrap reads in
// `.catch(() => [])` so a bad read degrades to an empty board, which is right
// for a transient failure but wrong for a malformed data file: a hand-edited
// listings.json that is an object instead of an array would silently show "no
// offers" forever. Throwing here fails at import, before any catch can hide it.
function asArray(value: unknown, file: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `data/${file} must be a JSON array of records, got ${typeof value}. ` +
        `A single record must still be wrapped in [ ].`
    );
  }
  return value as Record<string, unknown>[];
}

const RAW_LISTINGS = asArray(listingsJson, "listings.json");
const RAW_SOURCES = asArray(sourcesJson, "sources.json") as unknown as SourceRecord[];
const RAW_CANDIDATES = asArray(candidatesJson, "candidates.json");

const SOURCES_BY_SLUG = new Map(RAW_SOURCES.map((s) => [s.slug, s]));

export function getSources(): SourceRecord[] {
  return RAW_SOURCES;
}

export function getFeedSources(): SourceRecord[] {
  return RAW_SOURCES.filter((s) => s.kind === "feed");
}

export function getSource(slug: string): SourceRecord | null {
  return SOURCES_BY_SLUG.get(slug) ?? null;
}

// A listing's `source` field is the source slug. Expand it into the shape
// recordToListing expects so sourceName / sourceAttributionUrl populate.
function expand(rec: Record<string, unknown>): Record<string, unknown> {
  const slug = rec["source"];
  if (typeof slug !== "string") return rec;
  const src = SOURCES_BY_SLUG.get(slug);
  if (!src) return rec;
  return { ...rec, source: { id: src.slug, name: src.name, attribution_url: src.attribution_url } };
}

// Belt-and-braces on top of the stored status: an offer whose travel window has
// passed, or whose source is older than its max_age_days, is not shown even if
// nobody has run the ingest worker to mark it expired. UWG Anhang Nr. 5/6 puts
// the burden of proof on us, so staleness is enforced at read time too.
function isShowable(l: Listing): boolean {
  if (l.status !== "live") return false;
  const maxAge = SOURCES_BY_SLUG.get(l.sourceId)?.max_age_days ?? 14;
  return !isExpired(l, maxAge);
}

function allLive(): Listing[] {
  return RAW_LISTINGS.map(expand).map(recordToListing).filter(isShowable);
}

// Newest first, matching the old `sort: "-source_published_at"`.
function byNewest(a: Listing, b: Listing): number {
  return (b.sourcePublishedAt ?? "").localeCompare(a.sourcePublishedAt ?? "");
}

export async function getLiveListings(filter: BoardFilter = {}): Promise<Listing[]> {
  return allLive()
    .filter((l) => {
      if (filter.country && l.country !== filter.country) return false;
      if (filter.airport && l.departureAirport !== filter.airport) return false;
      if (filter.theme && !l.themes.includes(filter.theme)) return false;
      if (filter.maxPrice != null && (l.priceFromEur == null || l.priceFromEur > filter.maxPrice)) return false;
      return true;
    })
    .sort(byNewest);
}

export async function getLiveListingBySlug(slug: string): Promise<Listing | null> {
  return allLive().find((l) => l.slug === slug) ?? null;
}

export async function getHubListings(hub: HubDef): Promise<Listing[]> {
  return allLive().filter((l) => hubMatches(hub, l)).sort(byNewest);
}

// The curation queue: feed drafts a human has not yet approved or discarded.
export async function getCandidates(): Promise<Listing[]> {
  return RAW_CANDIDATES.map(expand)
    .map(recordToListing)
    .filter((l) => l.status === "needs_review")
    .sort(byNewest);
}

// The outbound click target. booking_url is deliberately absent from the Listing
// model (it must never reach the client), so the click route reads it here.
export function getClickTarget(id: string): { bookingUrl: string; sourceUrl: string } | null {
  const rec = RAW_LISTINGS.find((r) => r["id"] === id);
  if (!rec) return null;
  const booking = rec["booking_url"];
  const source = rec["source_url"];
  return {
    bookingUrl: typeof booking === "string" ? booking : "",
    sourceUrl: typeof source === "string" ? source : "",
  };
}
