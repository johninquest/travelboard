import { describe, expect, it } from "vitest";
import {
  KIND_LABEL,
  KIND_ORDER,
  PLATFORM_KINDS,
  allPlatforms,
  platformsByKind,
  platformsFor,
} from "./platforms";

describe("platform registry", () => {
  it("has a unique slug per platform", () => {
    const slugs = allPlatforms().map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("links only to https URLs", () => {
    for (const p of allPlatforms()) {
      expect(p.url).toMatch(/^https:\/\//);
    }
  });

  it("uses only the declared kinds, and labels every one", () => {
    for (const p of allPlatforms()) {
      expect(PLATFORM_KINDS).toContain(p.kind);
      expect(KIND_LABEL[p.kind]).toBeTruthy();
    }
    // A kind with no label would render an empty section heading.
    for (const kind of PLATFORM_KINDS) {
      expect(KIND_LABEL[kind].trim()).not.toBe("");
      expect(KIND_ORDER).toContain(kind);
    }
  });

  it("dates every platform so staleness is visible", () => {
    for (const p of allPlatforms()) {
      expect(p.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("states a business model and a limitation for every platform", () => {
    // These two sentences are the entire content of the page. An empty one would
    // list a platform with no reason to be there.
    for (const p of allPlatforms()) {
      expect(p.sells.trim()).not.toBe("");
      expect(p.limitation.trim()).not.toBe("");
    }
  });

  it("orders platforms so package sources come before build-it-yourself ones", () => {
    const ordered = platformsFor("ES");
    const kinds = ordered.map((p) => KIND_ORDER.indexOf(p.kind));
    expect(kinds).toEqual([...kinds].sort((a, b) => a - b));
    // The board is about package holidays, so a tour operator must precede a
    // flight-only source.
    expect(ordered[0].kind).toBe("tour-operator");
    expect(ordered[ordered.length - 1].kind).toBe("flight");
  });

  it("groups by kind without emitting empty groups", () => {
    const groups = platformsByKind("ES");
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.platforms.length).toBeGreaterThan(0);
      for (const p of group.platforms) expect(p.kind).toBe(group.kind);
    }
  });

  it("filters by country when a platform declares one", () => {
    // No platform is country-restricted today, so every destination sees the full
    // list. This asserts the filter does not accidentally drop everything.
    expect(platformsFor("GR").length).toBe(allPlatforms().length);
  });
});
