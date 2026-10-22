// Pocketbase upsert layer for the ingestion worker. Network and parsing live in
// feed-fetch.ts / rss.ts / feed-extract.ts; this module only talks to the DB.
//
// Invariant the whole product rests on: a feed item is *discovery*, never an
// advertised fact. New listings are created as needs_review/feed and are only
// ever published to `live` by a human who verified the price on the source page.
// This worker therefore NEVER creates or updates a row into `live`.

import type PocketBase from "pocketbase";
import { fetchFeed } from "./feed-fetch.ts";
import { parseFeed } from "./rss.ts";
import { draftFromFeed, type DraftListing } from "./feed-extract.ts";
import { isExpired } from "./listing.ts";

export type SourceRecord = {
  id: string;
  slug: string;
  name: string;
  feed_url: string;
  allowed: boolean;
  max_age_days: number;
};

export type IngestStats = {
  source: string;
  skipped: "not_allowed" | "no_feed" | null;
  fetched?: number;
  created?: number;
  refreshed?: number;
  unchanged?: number;
  expired?: number;
  notModified?: boolean;
  error?: string;
};

const GUID_FILTER = (guid: string) => `source_guid = "${escapeFilterValue(guid)}"`;
const SLUG_FILTER = (slug: string) => `slug = "${escapeFilterValue(slug)}"`;

function escapeFilterValue(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Fields we refresh when a feed item reappears. Never status/confidence —
// those are the human's decision and a re-poll must not silently publish anything.
function refreshFields(draft: DraftListing): Partial<DraftListing> {
  return {
    title: draft.title,
    summary: draft.summary,
    price_from_eur: draft.price_from_eur,
    price_pp_eur: draft.price_pp_eur,
    travel_window: draft.travel_window,
    nights: draft.nights,
    travellers: draft.travellers,
    accommodation: draft.accommodation,
    included: draft.included,
    excluded: draft.excluded,
    themes: draft.themes,
    source_published_at: draft.source_published_at,
    source_url: draft.source_url,
    booking_url: draft.booking_url,
    last_checked: draft.last_checked,
  };
}

async function upsertDraft(pb: PocketBase, sourceId: string, draft: DraftListing): Promise<"created" | "refreshed" | "unchanged"> {
  const byGuid = await pb
    .collection("travel_listings")
    .getFirstListItem(GUID_FILTER(draft.source_guid), { requestKey: null })
    .catch(() => null);
  const bySlug =
    !byGuid && draft.slug
      ? await pb
          .collection("travel_listings")
          .getFirstListItem(SLUG_FILTER(draft.slug), { requestKey: null })
          .catch(() => null)
      : null;
  const existing = byGuid ?? bySlug;

  if (!existing) {
    await pb.collection("travel_listings").create({ ...draft, source: sourceId });
    return "created";
  }

  const changes = refreshFields(draft);
  const dirty = Object.entries(changes).some(([k, v]) => !sameValue((existing as Record<string, unknown>)[k], v));
  if (!dirty) return "unchanged";
  await pb.collection("travel_listings").update(existing.id, changes);
  return "refreshed";
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  return String(a) === String(b);
}

// Drop live rows whose offer can no longer be advertised honestly (UWG Nr. 5/6).
async function expireStale(pb: PocketBase, source: SourceRecord): Promise<number> {
  const stale = await pb
    .collection("travel_listings")
    .getFullList({ filter: `source = "${source.id}" && status = "live"`, requestKey: null });
  let count = 0;
  for (const rec of stale) {
    const l = {
      travelWindow: (rec.travel_window as { start?: string; end?: string } | null) ?? null,
      sourcePublishedAt: (rec.source_published_at as string | null) ?? null,
    };
    if (isExpired(l, source.max_age_days)) {
      await pb.collection("travel_listings").update(rec.id, { status: "expired" });
      count++;
    }
  }
  return count;
}

export async function ingestSource(pb: PocketBase, source: SourceRecord, now: Date = new Date()): Promise<IngestStats> {
  if (!source.allowed) return { source: source.slug, skipped: "not_allowed" };
  if (!source.feed_url) return { source: source.slug, skipped: "no_feed" };

  let res;
  try {
    res = await fetchFeed(source.feed_url);
  } catch (err) {
    return { source: source.slug, skipped: null, error: err instanceof Error ? err.message : String(err) };
  }

  if (res.status === 304) {
    await pb.collection("travel_sources").update(source.id, { last_polled: now.toISOString() });
    return { source: source.slug, skipped: null, notModified: true };
  }
  if (res.status === 304 || (res.status < 200 || res.status >= 300) || !res.body) {
    await pb.collection("travel_sources").update(source.id, { last_polled: now.toISOString() });
    return { source: source.slug, skipped: null, error: `HTTP ${res.status}` };
  }

  const feed = parseFeed(res.body);
  let created = 0;
  let refreshed = 0;
  let unchanged = 0;
  for (const item of feed.items) {
    if (!item.title) continue;
    const draft = draftFromFeed(item, now);
    if (!draft.source_guid) continue;
    const outcome = await upsertDraft(pb, source.id, draft);
    if (outcome === "created") created++;
    else if (outcome === "refreshed") refreshed++;
    else unchanged++;
  }

  const expired = await expireStale(pb, source);

  await pb
    .collection("travel_sources")
    .update(source.id, {
      last_polled: now.toISOString(),
      ...(res.contentSignal ? { content_signal: res.contentSignal } : {}),
    });

  return { source: source.slug, skipped: null, fetched: feed.items.length, created, refreshed, unchanged, expired };
}

export async function loadFeedSources(pb: PocketBase): Promise<SourceRecord[]> {
  const records = await pb.collection("travel_sources").getFullList({ filter: "kind = 'feed'", requestKey: null });
  return records.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    feed_url: r.feed_url,
    allowed: r.allowed,
    max_age_days: r.max_age_days || 14,
  }));
}
