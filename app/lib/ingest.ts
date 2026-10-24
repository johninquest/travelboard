// Ingestion worker for the deals board. Network and parsing live in
// feed-fetch.ts / rss.ts / feed-extract.ts; this module turns feed items into
// candidate drafts and decides which existing candidates have gone stale.
//
// Invariant the whole product rests on: a feed item is *discovery*, never an
// advertised fact. Drafts are written as needs_review/feed and are only ever
// published to `live` by a human who verified the price on the source page.
// This worker therefore NEVER produces a `live` row.
//
// It writes to data/candidates.json, not to the board. Promoting a candidate
// means moving it into data/listings.json with status "live" and
// confidence "verified" — a deliberate, reviewable commit.

import { fetchFeed } from "./feed-fetch.ts";
import { parseFeed } from "./rss.ts";
import { draftFromFeed, type DraftListing } from "./feed-extract.ts";
import { isExpired } from "./listing.ts";
import type { SourceRecord } from "./store.ts";

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

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  return String(a) === String(b);
}

export type IngestResult = {
  stats: IngestStats;
  // The full candidate set after the run: this source's refreshed drafts plus
  // every other source's rows, untouched. The caller writes it back to
  // data/candidates.json.
  candidates: Record<string, unknown>[];
};

// Poll one source and merge its items into the candidate set. `existing` is the
// current contents of data/candidates.json (all sources — we split it here).
export async function ingestSource(
  source: SourceRecord,
  existing: Record<string, unknown>[],
  now: Date = new Date()
): Promise<IngestResult> {
  const mine = existing.filter((c) => c["source"] === source.slug);
  const others = existing.filter((c) => c["source"] !== source.slug);

  if (!source.allowed) {
    return { stats: { source: source.slug, skipped: "not_allowed" }, candidates: existing };
  }
  if (!source.feed_url) {
    return { stats: { source: source.slug, skipped: "no_feed" }, candidates: existing };
  }

  let res;
  try {
    res = await fetchFeed(source.feed_url);
  } catch (err) {
    return {
      stats: { source: source.slug, skipped: null, error: err instanceof Error ? err.message : String(err) },
      candidates: existing,
    };
  }

  if (res.status === 304) {
    return { stats: { source: source.slug, skipped: null, notModified: true }, candidates: existing };
  }
  if (res.status < 200 || res.status >= 300 || !res.body) {
    return { stats: { source: source.slug, skipped: null, error: `HTTP ${res.status}` }, candidates: existing };
  }

  const feed = parseFeed(res.body);
  const byGuid = new Map(mine.map((c) => [String(c["source_guid"] ?? ""), c]));
  const bySlug = new Map(mine.map((c) => [String(c["slug"] ?? ""), c]));

  let created = 0;
  let refreshed = 0;
  let unchanged = 0;
  const touched = new Set<Record<string, unknown>>();

  for (const item of feed.items) {
    if (!item.title) continue;
    const draft = draftFromFeed(item, now);
    if (!draft.source_guid) continue;

    const match = byGuid.get(draft.source_guid) ?? (draft.slug ? bySlug.get(draft.slug) : undefined);
    if (!match) {
      const rec: Record<string, unknown> = { ...draft, source: source.slug };
      mine.push(rec);
      byGuid.set(draft.source_guid, rec);
      if (draft.slug) bySlug.set(draft.slug, rec);
      touched.add(rec);
      created++;
      continue;
    }

    touched.add(match);
    const changes = refreshFields(draft);
    const dirty = Object.entries(changes).some(([k, v]) => !sameValue(match[k], v));
    if (!dirty) {
      unchanged++;
      continue;
    }
    Object.assign(match, changes);
    refreshed++;
  }

  // Drop candidates whose offer can no longer be advertised honestly
  // (UWG Anhang Nr. 5/6). Only untouched rows are eligible — a row we just
  // refreshed is by definition still current.
  let expired = 0;
  const kept = mine.filter((c) => {
    if (touched.has(c)) return true;
    const l = {
      travelWindow: (c["travel_window"] as { start?: string; end?: string } | null) ?? null,
      sourcePublishedAt: (c["source_published_at"] as string | null) ?? null,
    };
    if (isExpired(l, source.max_age_days, now)) {
      expired++;
      return false;
    }
    return true;
  });

  return {
    stats: {
      source: source.slug,
      skipped: null,
      fetched: feed.items.length,
      created,
      refreshed,
      unchanged,
      expired,
    },
    candidates: [...others, ...kept],
  };
}
