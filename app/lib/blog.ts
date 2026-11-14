// The blog's single source of truth for *what an article is*.
//
// Deliberately metadata-only: the MDX bodies live in `lib/blog-bodies.ts`, which
// imports the files. Keeping them apart means this module is plain TypeScript
// that can be unit tested without an MDX toolchain, and the body map is a
// `Record<PostSlug, …>`, so a post declared here without a body is a type error
// rather than a runtime 500.
//
// The shape enforces the product rule: every article is about a *decision*, so
// every article names the hub whose live offers it is grounded in. There is no
// free-floating "evergreen content" category, because that is the affiliate SEO
// farm the project explicitly decided not to build.

import { ALL_HUBS } from "./hubs";
import { SITE_URL, BRAND } from "./site";

export type BlogPost = {
  slug: string;
  title: string;
  summary: string; // one honest sentence — used on the index, the feed and metadata
  publishedAt: string; // YYYY-MM-DD
  updatedAt?: string; // YYYY-MM-DD, only when the substance changed
  hub: string; // hub slug from lib/hubs — the decision the article is about
    deals: readonly string[]; // listing slugs the article refers to (may be empty)
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Ordered newest first by hand rather than by date at import time: the array is
// also the reading order on /blog, and an explicit order keeps a rewritten old
// post from silently jumping to the top.
  //
  // `as const` keeps each slug a literal type, so `PostSlug` below is a real union
  // and a missing body in lib/blog-bodies.ts is a compile error.
  export const POSTS = [
  {
    slug: "how-to-spot-a-good-package-deal",
    title: "How to tell a real package-holiday deal from a fake one",
    summary:
      "The five checks that separate a genuine price drop from a headline number that evaporates at checkout.",
    publishedAt: "2026-11-13",
    hub: "beach",
    deals: [],
  },
  ] as const satisfies readonly BlogPost[];

export type PostSlug = (typeof POSTS)[number]["slug"];

// A concrete registry row. `slug` is narrowed to the literal union (so
// `BODIES[post.slug]` type-checks), while optional fields such as `updatedAt`
// stay optional instead of being erased by the literal inference.
export type Post = BlogPost & { readonly slug: PostSlug };

const HUB_SLUGS = new Set(ALL_HUBS.map((h) => h.slug));

// Validate on import, for the same reason lib/store.ts does: a typo in this
// table must fail the build, not silently produce a broken URL or a page whose
// live-offer block always renders the "nothing to show" state.
function validate<T extends BlogPost>(posts: readonly T[]): readonly T[] {
  const seen = new Set<string>();
  for (const p of posts) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) {
      throw new Error(`blog: slug "${p.slug}" must be lowercase-hyphenated`);
    }
    if (seen.has(p.slug)) throw new Error(`blog: duplicate slug "${p.slug}"`);
    seen.add(p.slug);
    if (!DATE.test(p.publishedAt)) {
      throw new Error(`blog: ${p.slug} publishedAt must be YYYY-MM-DD`);
    }
    if (p.updatedAt && !DATE.test(p.updatedAt)) {
      throw new Error(`blog: ${p.slug} updatedAt must be YYYY-MM-DD`);
    }
    if (!HUB_SLUGS.has(p.hub)) {
      throw new Error(
        `blog: ${p.slug} names hub "${p.hub}", which is not in lib/hubs ALL_HUBS`
      );
    }
  }
  return posts;
}

const VALIDATED = validate(POSTS);

export function allPosts(): readonly Post[] {
  return VALIDATED;
}

export function getPost(slug: string): Post | null {
  return VALIDATED.find((p) => p.slug === slug) ?? null;
}

export function latestPosts(n: number): readonly Post[] {
  return VALIDATED.slice(0, n);
}

export function postPath(slug: string): string {
  return `/blog/${slug}`;
}

export function postUrl(slug: string): string {
  return `${SITE_URL}${postPath(slug)}`;
}

// "13 November 2026" — the same en-GB formatting the deal pages use, so dates
// never render differently in two places.
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// RSS 2.0. Descriptions only, no <content:encoded>: the article body belongs on
// the page (that is where the offers are), and a full-text feed would strip the
// thing that makes the article worth reading.
//
// lastBuildDate comes from the newest post rather than the clock, so the feed is
// byte-identical between builds unless an article actually changed. That keeps
// the route prerenderable and avoids invalidating caches on every deploy.
export function buildRssFeed(posts: readonly BlogPost[], now?: Date): string {
  const newest = posts.reduce<string | null>((acc, p) => {
    const d = p.updatedAt ?? p.publishedAt;
    return acc === null || d > acc ? d : acc;
  }, null);
  const buildDate = now ?? new Date(`${newest ?? "1970-01-01"}T00:00:00Z`);

  const items = posts
    .map((p) => {
      const lines = [
        "    <item>",
        `      <title>${xml(p.title)}</title>`,
        `      <link>${xml(postUrl(p.slug))}</link>`,
        `      <guid isPermaLink="true">${xml(postUrl(p.slug))}</guid>`,
        `      <pubDate>${new Date(`${p.publishedAt}T00:00:00Z`).toUTCString()}</pubDate>`,
        `      <description>${xml(p.summary)}</description>`,
        "    </item>",
      ];
      return lines.join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${xml(`${BRAND} guides`)}</title>`,
    `    <link>${xml(`${SITE_URL}/blog`)}</link>`,
    `    <description>How to judge a package-holiday offer, grounded in the offers we have verified.</description>`,
    `    <language>en</language>`,
    `    <lastBuildDate>${buildDate.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${xml(`${SITE_URL}/blog/feed.xml`)}" rel="self" type="application/rss+xml" />`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}