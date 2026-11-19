import { describe, expect, it } from "vitest";
import { NICHE_CODES, NICHE_KIND, isNicheCode, requireNiche } from "./niche";

describe("niche tokens", () => {
  it("keeps every token usable as a sub-ID component", () => {
    // Underscore is the sub-ID delimiter, so a token containing one would split
    // every report row. The module throws at import; this asserts the rule holds.
    for (const code of NICHE_CODES) {
      expect(code).toMatch(/^[a-z0-9]+$/);
      expect(code.length).toBeLessThanOrEqual(12);
    }
  });

  it("classifies every token as audience or seasonal", () => {
    // A token with no kind would be silently unreadable in the week-12 report:
    // you could not tell an audience result from a timing result.
    for (const code of NICHE_CODES) {
      expect(NICHE_KIND[code]).toMatch(/^(audience|seasonal)$/);
    }
    expect(Object.keys(NICHE_KIND).sort()).toEqual([...NICHE_CODES].sort());
  });

  it("marks the seasonal lenses as seasonal, not as audience claims", () => {
    expect(NICHE_KIND.offseason).toBe("seasonal");
    expect(NICHE_KIND.timing).toBe("seasonal");
    expect(NICHE_KIND.solo).toBe("audience");
  });

  it("rejects an invented token rather than degrading to general", () => {
    expect(isNicheCode("mobility")).toBe(false);
    expect(() => requireNiche("mobility")).toThrow(/not in NICHE_CODES/);
    expect(requireNiche("offseason")).toBe("offseason");
  });
});
