import { describe, expect, it } from "vitest";
import { criteriaSchema } from "@/lib/criteria";
import { formatEur, freshness, priceLine } from "@/lib/trip";

describe("criteriaSchema", () => {
  const valid = {
    source: "find",
    departure: "MUC",
    nights: 7,
    budgetEur: 1200,
  };

  it("accepts a minimal find request", () => {
    expect(criteriaSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults travellers to 2", () => {
    const r = criteriaSchema.safeParse(valid);
    expect(r.success && r.data.travellers).toBe(2);
  });

  it("rejects nights outside 4–10", () => {
    expect(criteriaSchema.safeParse({ ...valid, nights: 3 }).success).toBe(false);
    expect(criteriaSchema.safeParse({ ...valid, nights: 11 }).success).toBe(false);
  });

  it("rejects budget outside €400–2,000", () => {
    expect(criteriaSchema.safeParse({ ...valid, budgetEur: 399 }).success).toBe(false);
    expect(criteriaSchema.safeParse({ ...valid, budgetEur: 2001 }).success).toBe(false);
  });

  it("rejects departures outside the constrained market", () => {
    expect(criteriaSchema.safeParse({ ...valid, departure: "AMS" }).success).toBe(false);
  });

  it("accepts a beat request with an offer", () => {
    const r = criteriaSchema.safeParse({
      ...valid,
      source: "beat",
      offer: { url: "https://example.com/deal", priceTotalEur: 1499 },
    });
    expect(r.success).toBe(true);
  });
});

describe("trip formatting", () => {
  it("formats EUR with de-DE grouping", () => {
    expect(formatEur(1499)).toBe("€1.499");
  });

  it("price line shows total and per person", () => {
    expect(priceLine({ priceTotalEur: 842, pricePppEur: 421 })).toBe(
      "€842 total · €421 / person",
    );
  });

  it("flags prices older than 24h as stale", () => {
    const now = new Date("2026-06-01T12:00:00Z");
    const fresh = freshness("2026-06-01T05:00:00Z", now);
    expect(fresh.stale).toBe(false);
    const old = freshness("2026-05-20T12:00:00Z", now);
    expect(old.stale).toBe(true);
    expect(old.label).toMatch(/may have changed/);
  });
});
