import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { ALL_HUBS } from "@/lib/hubs";
import { getHubListings, getLiveListings } from "@/lib/store";
import { allPosts, postPath } from "@/lib/blog";
import { SITE_URL as SITE } from "@/lib/site";
// A hub is only worth indexing when it carries enough real offers — same gate
// as the page itself, so sitemap and page never disagree.
const MIN_OFFERS = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // cacheComponents: a sitemap must be dynamic or it's baked at build time.
  await connection();
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    // The front door is the source guide. Month-scoped, so it changes on the first
    // of every month. It carries no offers, which is why it is not gated by
    // MIN_OFFERS below: its data is a sourced season matrix and a verified platform
    // registry, not a thin offer list. See the 2026-11-20 entry in
    // docs/decision-log.md.
    { url: `${SITE}/`, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: `${SITE}/deals`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    // /where-to-look renders the same body and canonicalises to `/`, so it is not
    // listed here — a sitemap entry would contradict its own canonical.
  ];

    // Guides are hand-written and few, so every one is in the sitemap. The RSS
    // feed is not: it duplicates these URLs, it is not a page.
    const blogUrls: MetadataRoute.Sitemap = [
      { url: `${SITE}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
      ...allPosts().map((p) => ({
        url: `${SITE}${postPath(p.slug)}`,
        lastModified: new Date(`${p.updatedAt ?? p.publishedAt}T00:00:00Z`),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ];

  const listings = await getLiveListings().catch(() => []);
  const listingUrls: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${SITE}/deal/${l.slug}`,
    // source_published_at is the only timestamp we actually store; there is no
    // separate "updated" field, so this is the honest lastModified.
    lastModified: l.sourcePublishedAt ? new Date(l.sourcePublishedAt) : now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Check each hub's offer count; drop hubs below the gate.
  const hubCounts = await Promise.all(
    ALL_HUBS.map(async (hub) => ({
      hub,
      count: (await getHubListings(hub).catch(() => [])).length,
    })),
  );

  const hubUrls: MetadataRoute.Sitemap = hubCounts
    .filter(({ count }) => count >= MIN_OFFERS)
    .map(({ hub }) => ({
      url: `${SITE}/holidays/${hub.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

  return [...staticUrls, ...blogUrls, ...listingUrls, ...hubUrls];
}
