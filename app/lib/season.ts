// The season matrix behind /where-to-look: for each destination the board covers,
// which months are peak, shoulder, quiet or closed.
//
// This is deliberately NOT a price or availability claim. It says when a
// destination is in season, which is a fact about climate and the German holiday
// calendar, not about what any supplier has in stock today. The page built on it
// states that distinction in prose, because the project's hardest rule is that an
// unverified availability claim must never be presented as a fact.
//
// Every row must name a source. A destination with no named source does not go in
// data/season.json at all — the page then reports it as unsourced rather than
// guessing. That is why Portugal, Cyprus and Malta are absent: the research the
// matrix was seeded from does not cover them.

import seasonJson from "@/data/season.json";
import { DESTINATION_COUNTRIES } from "./criteria";

export const SEASON_BANDS = ["peak", "shoulder", "quiet", "closed"] as const;
export type SeasonBand = (typeof SEASON_BANDS)[number];

/**
 * How the row was derived. `corridor` means the source states a season for this
 * specific origin-to-destination pair. `market` means the source only states the
 * origin market's overall demand calendar, so the row is a weaker claim and the
 * page says so.
 */
export const SEASON_BASIS = ["corridor", "market"] as const;
export type SeasonBasis = (typeof SEASON_BASIS)[number];

export type SeasonRow = {
  country: string; // ISO alpha-2, must be in DESTINATION_COUNTRIES
  name: string;
  months: SeasonBand[]; // exactly 12, January first
  basis: SeasonBasis;
  note: string;
  source: string;
  sourceUrl: string;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function monthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex] ?? "";
}

const COUNTRY_SET = new Set<string>(DESTINATION_COUNTRIES);
const BAND_SET = new Set<string>(SEASON_BANDS);
const BASIS_SET = new Set<string>(SEASON_BASIS);

// Validate on import, in the same style as lib/blog.ts and lib/niche.ts: a typo in
// a hand-authored data file must fail the build, not render a page that quietly
// claims a destination is in season in the wrong month.
function validate(rows: unknown): SeasonRow[] {
  if (!Array.isArray(rows)) {
    throw new Error("data/season.json must be a JSON array of rows");
  }
  const seen = new Set<string>();
  for (const raw of rows as Record<string, unknown>[]) {
    const country = raw["country"];
    if (typeof country !== "string" || !COUNTRY_SET.has(country)) {
      throw new Error(
        `season: country "${String(country)}" is not in DESTINATION_COUNTRIES (lib/criteria.ts)`
      );
    }
    if (seen.has(country)) {
      throw new Error(`season: duplicate country "${country}" — one row per destination`);
    }
    seen.add(country);

    const months = raw["months"];
    if (!Array.isArray(months) || months.length !== 12) {
      throw new Error(
        `season: ${country} months must be an array of exactly 12 entries, January first`
      );
    }
    for (const band of months) {
      if (typeof band !== "string" || !BAND_SET.has(band)) {
        throw new Error(
          `season: ${country} has band "${String(band)}", which is not one of ${SEASON_BANDS.join(", ")}`
        );
      }
    }

    const basis = raw["basis"];
    if (typeof basis !== "string" || !BASIS_SET.has(basis)) {
      throw new Error(
        `season: ${country} basis "${String(basis)}" must be one of ${SEASON_BASIS.join(", ")}`
      );
    }

    // A row without a named source is an unsourced claim. Refuse it here rather
    // than let the page present it as fact.
    for (const field of ["name", "note", "source", "sourceUrl"] as const) {
      const value = raw[field];
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`season: ${country} is missing "${field}" — every row needs a named source`);
      }
    }
  }
  return rows as SeasonRow[];
}

const ROWS: SeasonRow[] = validate(seasonJson);

export function allSeasons(): readonly SeasonRow[] {
  return ROWS;
}

export function seasonFor(country: string): SeasonRow | null {
  return ROWS.find((r) => r.country === country) ?? null;
}

/** The band for a destination in a given month, or null when it is unsourced. */
export function bandIn(country: string, monthIndex: number): SeasonBand | null {
  const row = seasonFor(country);
  if (!row) return null;
  return row.months[monthIndex] ?? null;
}

/**
 * Destinations the board covers that have no sourced season row. The page names
 * these explicitly instead of leaving a silent gap — a reader can then tell the
 * difference between "out of season" and "we do not know".
 */
export function unsourcedCountries(): string[] {
  const sourced = new Set(ROWS.map((r) => r.country));
  return DESTINATION_COUNTRIES.filter((c) => !sourced.has(c));
}

/** True when the destination is worth showing as an option in this month. */
export function isInSeason(country: string, monthIndex: number): boolean {
  const band = bandIn(country, monthIndex);
  return band === "peak" || band === "shoulder";
}
