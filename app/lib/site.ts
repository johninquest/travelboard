// Single source of truth for the public brand and the canonical origin.
// The brand is what a human reads; the origin is what crawlers, sitemaps and
// JSON-LD get. They once drifted apart (the metadata brand disagreed with the
// travelboard.johnxlabs.de origin) — keep both here so they can't.

export const BRAND = "travelboard";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://travelboard.johnxlabs.de";
