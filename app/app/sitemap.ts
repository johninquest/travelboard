import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { pbPublic } from "@/lib/pb";
import { ALL_HUBS, hubFilter } from "@/lib/hubs";
import { SITE_URL as SITE } from "@/lib/site";
// A hub is only worth indexing when it carries enough real offers — same gate
// as the page itself, so sitemap and page never disagree.
const MIN_OFFERS = 3;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // cacheComponents: a sitemap must be dynamic or it's baked at build time.
  await connection();
  const pb = pbPublic();
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/deals`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
  ];

  const listingUrls: MetadataRoute.Sitemap = await pb
    .collection("travel_listings")
    .getFullList({
      filter: 'status = "live"',
      fields: "slug,source_updated_at,first_seen_at",
      sort: "-source_updated_at",
      requestKey: null,
    })
    .then((records) =>
      records.map((r) => ({
        url: `${SITE}/deal/${String(r["slug"])}`,
        lastModified: new Date(String(r["source_updated_at"] ?? r["first_seen_at"] ?? now)),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    )
    .catch(() => []);

  // Check each hub's offer count; drop hubs below the gate.
  const hubCounts = await Promise.all(
    ALL_HUBS.map(async (h) => {
      const n = await pb
        .collection("travel_listings")
        .getFullList({ filter: hubFilter(h), fields: "id", requestKey: null })
        .then((r) => r.length)
        .catch(() => 0);
      return { hub: h, count: n };
    }),
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
