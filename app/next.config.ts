import type { NextConfig } from "next";
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

export default nextConfig;
