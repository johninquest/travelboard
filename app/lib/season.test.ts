import { describe, expect, it } from "vitest";
import {
  SEASON_BANDS,
  allSeasons,
  bandIn,
  isInSeason,
  monthName,
  seasonFor,
  unsourcedCountries,
} from "./season";
import { DESTINATION_COUNTRIES } from "./criteria";

describe("season matrix", () => {
  it("gives every row exactly twelve months", () => {
    // A short array would silently shift every month after the gap, which is the
    // one error a reader could not spot on the page.
    for (const row of allSeasons()) {
      expect(row.months).toHaveLength(12);
    }
  });

  it("uses only the declared bands", () => {
    for (const row of allSeasons()) {
      for (const band of row.months) {
        expect(SEASON_BANDS).toContain(band);
      }
    }
  });

  it("only covers destinations the board actually sells", () => {
    for (const row of allSeasons()) {
      expect(DESTINATION_COUNTRIES).toContain(row.country as (typeof DESTINATION_COUNTRIES)[number]);
    }
  });

  it("names a source for every row", () => {
    // An unsourced row is an unsourced claim. The page must never present one.
    for (const row of allSeasons()) {
      expect(row.source.trim()).not.toBe("");
      expect(row.sourceUrl).toMatch(/^https:\/\//);
      expect(row.note.trim()).not.toBe("");
    }
  });

  it("reports the destinations it cannot answer for instead of guessing", () => {
    // Portugal, Cyprus and Malta are in the locked market but not in the research
    // the matrix was seeded from. They must surface as unsourced, not as "quiet".
    const unsourced = unsourcedCountries();
    expect(unsourced).toContain("PT");
    expect(unsourced).toContain("CY");
    expect(unsourced).toContain("MT");
    for (const country of unsourced) {
      expect(seasonFor(country)).toBeNull();
      expect(bandIn(country, 6)).toBeNull();
      expect(isInSeason(country, 6)).toBe(false);
    }
  });

  it("reads the month index as January-first", () => {
    expect(monthName(0)).toBe("January");
    expect(monthName(11)).toBe("December");
    // Spain is a summer destination; January is not in season and July is.
    expect(isInSeason("ES", 0)).toBe(false);
    expect(isInSeason("ES", 6)).toBe(true);
    expect(bandIn("ES", 6)).toBe("peak");
  });

  it("treats shoulder as in season and quiet as not", () => {
    // May is shoulder for Spain. The page shows shoulder destinations, so this
    // distinction is what decides whether a block appears at all.
    expect(bandIn("ES", 4)).toBe("peak");
    expect(bandIn("ES", 2)).toBe("shoulder");
    expect(isInSeason("ES", 2)).toBe(true);
    expect(bandIn("ES", 0)).toBe("quiet");
    expect(isInSeason("ES", 0)).toBe(false);
  });
});
