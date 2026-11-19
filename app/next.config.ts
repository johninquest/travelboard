import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { LEGACY_HUB_SLUGS } from "./lib/hubs";

// The hub slugs were German before the site moved to English. Permanent redirects
// keep whatever signal the old URLs accumulated instead of 404-ing them.
const hubRedirects = Object.entries(LEGACY_HUB_SLUGS).map(([from, to]) => ({
  source: `/holidays/${from}`,
  destination: `/holidays/${to}`,
  permanent: true,
}));

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  experimental: {
    // Set by `next upgrade --agent=security` (16.4.2 → 16.4.6). Marks this app as
    // having taken the security upgrade so the advisory gate does not re-fire.
    agentUpgrade: "security",
  },
  async redirects() {
    return hubRedirects;
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Blog articles are MDX files imported by lib/blog.ts and compiled at build
// time. No pageExtensions change: .mdx is not treated as a route, so only the
// registry decides what a URL is.
const withMDX = createMDX({});

export default withMDX(nextConfig);
