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
