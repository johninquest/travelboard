import { allPosts, buildRssFeed } from "@/lib/blog";

// The feed reads no request data, so Cache Components prerenders it at build
// time. `dynamic`/`dynamicParams` route config is rejected under cacheComponents,
// so it is deliberately absent.

export function GET() {
  return new Response(buildRssFeed(allPosts()), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}