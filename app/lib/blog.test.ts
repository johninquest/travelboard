import { describe, expect, it } from "vitest";
import { ALL_HUBS } from "./hubs";
import { NICHE_CODES } from "./niche";
import { allPosts, buildRssFeed, formatDate, getPost, postPath, postUrl } from "./blog";

describe("blog registry", () => {
  it("imports without throwing — every post is valid", () => {
    expect(() => allPosts()).not.toThrow();
  });

  it("keeps slugs unique and URL-safe", () => {
    const slugs = allPosts().map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("grounds every post in a hub that exists", () => {
    const hubs = new Set(ALL_HUBS.map((h) => h.slug));
    for (const post of allPosts()) expect(hubs.has(post.hub)).toBe(true);
  });

  it("never dates an update before its publication", () => {
    for (const post of allPosts()) {
      if (post.updatedAt) expect(post.updatedAt >= post.publishedAt).toBe(true);
    }
  });

  it("declares a niche that exists in lib/niche and a usable track code", () => {
    const codes = new Set<string>(NICHE_CODES);
    const seen = new Set<string>();
    for (const post of allPosts()) {
      expect(codes.has(post.niche)).toBe(true);
      // No underscore: it is the sub-ID delimiter.
      expect(post.trackCode).toMatch(/^[a-z0-9]+$/);
      expect(post.trackCode.length).toBeLessThanOrEqual(16);
      expect(seen.has(post.trackCode)).toBe(false);
      seen.add(post.trackCode);
    }
  });

  it("resolves a declared slug and rejects an undeclared one", () => {
    const [first] = allPosts();
    expect(first).toBeDefined();
    expect(getPost(first.slug)?.slug).toBe(first.slug);
    expect(getPost("not-a-post")).toBeNull();
    expect(postPath(first.slug)).toBe(`/blog/${first.slug}`);
    expect(postUrl(first.slug).endsWith(`/blog/${first.slug}`)).toBe(true);
  });
});

describe("formatDate", () => {
  it("renders a YYYY-MM-DD date without a timezone shift", () => {
    // Parsed as UTC on purpose: a local-time parse turns 2026-01-01 into
    // 31 December in any negative-offset timezone.
    expect(formatDate("2026-01-01")).toBe("1 January 2026");
  });
});

describe("buildRssFeed", () => {
  it("emits a well-formed channel with one item per post", () => {
    const xml = buildRssFeed(allPosts());
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml.match(/<item>/g)?.length ?? 0).toBe(allPosts().length);
    expect(xml.match(/<\/item>/g)?.length ?? 0).toBe(allPosts().length);
  });

  it("escapes markup in titles and summaries", () => {
    const xml = buildRssFeed([
      {
        slug: "test",
        title: 'A & B <script> "quoted"',
        summary: "Under 500 & over 1,000",
        publishedAt: "2026-02-01",
        hub: "beach",
        niche: "general",
        trackCode: "testcode",
        deals: [],
      },
    ]);
    expect(xml).toContain("A &amp; B &lt;script&gt; &quot;quoted&quot;");
    expect(xml).toContain("Under 500 &amp; over 1,000");
    expect(xml).not.toContain("<script>");
  });

  it("is deterministic, so the route can prerender", () => {
    expect(buildRssFeed(allPosts())).toBe(buildRssFeed(allPosts()));
  });
});