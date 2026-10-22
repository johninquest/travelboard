import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://travelboard.johnxlabs.de";

// robots.txt policy (from the plan):
// - Search + AI *citation* bots are wanted: they send users and citations.
//   OAI-SearchBot, ChatGPT-User, PerplexityBot, Google-Extended kept open.
// - Training-only crawlers are a separate business decision; GPTBot stays
//   allowed for now since citation and training share the same crawl for many
//   engines — revisit once there's traffic data.
// - Admin + internal APIs are never for crawlers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/admin", "/api/track", "/api/click", "/r/"],
      },
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: ["/admin", "/api/admin", "/api/track", "/api/click", "/r/"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: ["/admin", "/api/admin", "/api/track", "/api/click", "/r/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
