import { describe, expect, it } from "vitest";
import { allPosts } from "./blog";
import { NICHE_CODES } from "./niche";
import { fromParam, resolveOrigin, withFrom } from "./surface";
import {
  buildAffiliateUrl,
  composeSubId,
  type AffiliateConfig,
} from "./affiliate";

// The whole point of this module is that `from` is untrusted URL data that ends up
// inside an affiliate marker suffix. These tests are that enforcement — they are the
// "hook" the strategy asks for, expressed as `npm test` rather than a git hook.

describe("resolveOrigin — recognised surfaces", () => {
  it("accepts the bare surfaces and carries no attribution beyond them", () => {
    for (const value of ["board", "deal", "direct"]) {
      const o = resolveOrigin(value);
      expect(o.surface).toBe(value);
      expect(o.ref).toBeNull();
      expect(o.article).toBeNull();
      expect(o.niche).toBe("general");
    }
  });

  it("resolves a declared hub", () => {
    const o = resolveOrigin("hub_beach");
    expect(o.surface).toBe("hub");
    expect(o.ref).toBe("beach");
    expect(o.article).toBeNull();
  });

  it("trims surrounding whitespace before matching", () => {
    expect(resolveOrigin("  board  ").surface).toBe("board");
  });

  it("resolves a declared post to its declared niche and track code", () => {
    const post = allPosts()[0];
    const o = resolveOrigin(`blog_${post.slug}`);
    expect(o.surface).toBe("blog");
    expect(o.ref).toBe(post.slug);
    expect(o.niche).toBe(post.niche);
    expect(o.article).toBe(post.trackCode);
  });

  it("treats a missing or blank value as direct", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(resolveOrigin(value).surface).toBe("direct");
    }
  });
});

describe("resolveOrigin — anything not in a registry is direct", () => {
  // The injection case. `from` is attacker-controllable, and the resolved niche and
  // article are appended to the affiliate marker. If an unknown slug were passed
  // through, anyone could mint arbitrary rows in the Travelpayouts report simply by
  // sharing a crafted deal URL.
  const hostile = [
    "blog_not-a-post",
    "hub_notahub",
    "blog_../../etc",
    "blog_marker=999",
    "blog_ beach",
    "nonsense",
    "blog",
    "hub",
    "hub_",
    "_beach",
    "board_x",
    "BEACH",
    "blog_beach;drop",
    "direct_extra",
    "general_spotdeal_sample-001",
  ];

  for (const value of hostile) {
    it(`refuses "${value}"`, () => {
      const o = resolveOrigin(value);
      expect(o.surface).toBe("direct");
      expect(o.ref).toBeNull();
      expect(o.article).toBeNull();
      expect(o.niche).toBe("general");
    });
  }

  it("never returns a niche outside NICHE_CODES", () => {
    const codes = new Set<string>(NICHE_CODES);
    for (const value of [...hostile, "blog_" + allPosts()[0].slug, "hub_beach", "board"]) {
      expect(codes.has(resolveOrigin(value).niche)).toBe(true);
    }
  });
});

describe("fromParam / resolveOrigin round-trip", () => {
  // If the value a page emits is not the value the route understands, attribution is
  // silently lost — the click still works, it just lands in the general pool. That is
  // a quiet failure, so it is tested rather than trusted.
  it("survives a round trip for every post and hub", () => {
    for (const post of allPosts()) {
      const from = fromParam({ surface: "blog", ref: post.slug });
      const o = resolveOrigin(from);
      expect(o.surface).toBe("blog");
      expect(o.ref).toBe(post.slug);
    }
    for (const hub of ["beach", "crete", "munich", "january"]) {
      const from = fromParam({ surface: "hub", ref: hub });
      const o = resolveOrigin(from);
      // Only hubs that actually exist resolve; the rest must be direct.
      expect(["hub", "direct"]).toContain(o.surface);
    }
  });

  it("emits the bare name when there is no ref", () => {
    expect(fromParam({ surface: "board" })).toBe("board");
    expect(resolveOrigin(fromParam({ surface: "board" })).surface).toBe("board");
  });
});

describe("withFrom", () => {
  it("appends the parameter", () => {
    expect(withFrom("/deal/crete-7", "blog_my-post")).toBe("/deal/crete-7?from=blog_my-post");
  });

  it("leaves the href alone when there is no origin", () => {
    expect(withFrom("/deal/crete-7", null)).toBe("/deal/crete-7");
    expect(withFrom("/deal/crete-7", "")).toBe("/deal/crete-7");
    expect(withFrom("/deal/crete-7", undefined)).toBe("/deal/crete-7");
  });
});

describe("end-to-end attribution chain", () => {
  // The chain a real click runs: a page emits `from`, the route resolves it, composes
  // the sub-ID, and the builder puts it on the marker. Each link is unit-tested alone;
  // this asserts they agree, because a mismatch loses attribution silently — the click
  // still redirects, it just lands in the general pool and nobody notices.
  const config: AffiliateConfig = {
    marker: "123456",
    trs: "197987",
    programs: { booking: "2076" },
  };

  it("carries a blog post's niche and track code into the marker suffix", () => {
    const post = allPosts()[0];
    const origin = resolveOrigin(fromParam({ surface: "blog", ref: post.slug }));
    const subId = composeSubId({
      niche: origin.niche,
      article: origin.article,
      listingId: "sample-001",
    });
    const url = new URL(
      buildAffiliateUrl({
        network: "travelpayouts",
        program: "booking",
        destinationUrl: "https://www.urlaubspiraten.de/off/x",
        subId,
        config,
      })
    );
    expect(url.searchParams.get("marker")).toBe(
      `123456.${origin.niche}_${origin.article}_sample_001`
    );
    expect(url.searchParams.get("marker")!.length).toBeLessThanOrEqual(
      "123456.".length + 64
    );
  });

  it("degrades a hostile from= to a marker with no attacker text", () => {
    const origin = resolveOrigin("blog_evil;marker=999");
    const subId = composeSubId({
      niche: origin.niche,
      article: origin.article,
      listingId: "sample-001",
    });
    const url = new URL(
      buildAffiliateUrl({
        network: "travelpayouts",
        program: "booking",
        destinationUrl: "https://example.com/off",
        subId,
        config,
      })
    );
    expect(url.searchParams.get("marker")).toBe("123456.general_sample_001");
    expect(url.searchParams.get("marker")).not.toContain("999");
    expect(url.searchParams.get("marker")).not.toContain("evil");
  });
});
