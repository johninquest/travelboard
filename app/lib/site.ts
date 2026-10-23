// Single source of truth for the public brand and the canonical origin.
// The brand is what a human reads; the origin is what crawlers, sitemaps and
// JSON-LD get. They were drifting apart (metadata said "sunwise." while the
// sitemap and structured data said travelboard.johnxlabs.de) — keep them here.

export const BRAND = "sunwise.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://travelboard.johnxlabs.de";
