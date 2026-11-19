import { describe, expect, it } from "vitest";
import { getLiveListings, getSources } from "./store";

// The board must never render an offer from a source it is not allowed to read.
// This was a real bug: `allowed` was enforced only when polling feeds, so the
// `sample` source (allowed: false, max_age_days: 365) kept placeholder prices on
// the public board long after they should have expired.
describe("store: source allow-list", () => {
  it("never returns an offer whose source is disallowed", async () => {
    const disallowed = new Set(
      getSources().filter((s) => !s.allowed).map((s) => s.slug)
    );
    expect(disallowed.size).toBeGreaterThan(0);

    const live = await getLiveListings();
    for (const l of live) {
      expect(disallowed.has(l.sourceId)).toBe(false);
    }
  });

  it("returns nothing at all while every listing comes from the sample source", async () => {
    // Guards the launch state: the committed data is placeholder-only, so the
    // board must render its empty state rather than three invented prices.
    const live = await getLiveListings();
    const fromSample = live.filter((l) => l.sourceId === "sample");
    expect(fromSample).toHaveLength(0);
  });
});
