import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { ALL_HUBS } from "@/lib/hubs";
import { getHubListings, getLiveListings } from "@/lib/store";
import { SITE_URL as SITE } from "@/lib/site";
// A hub is only worth indexing when it carries enough real offers — same gate
// as the page itself, so sitemap and page never disagree.
const MIN_OFFERS = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // cacheComponents: a sitemap must be dynamic or it's baked at build time.
  await connection();
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/deals`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
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

  return [...staticUrls, ...listingUrls, ...hubUrls];
}
