// Single source of truth for the public brand and the canonical origin.
// The brand is what a human reads; the origin is what crawlers, sitemaps and
// JSON-LD get. They once drifted apart (the metadata brand disagreed with the
// travelboard.johnxlabs.de origin) — keep both here so they can't.

export const BRAND = "travelboard";

// Declared in one place so the feed stays discoverable on every page: a
// page-level `alternates` export replaces the layout's rather than merging, so
// each page that sets alternates has to repeat this.
export const RSS_ALTERNATE = { "application/rss+xml": "/blog/feed.xml" } as const;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://travelboard.johnxlabs.de";
