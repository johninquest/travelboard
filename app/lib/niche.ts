// Lens tokens used in affiliate sub-IDs.
//
// Deliberately tiny and deliberately not a guess at the audit outcome: the week-1
// audit in docs/niche-audits.md decides which lenses are in the test, and a token is
// added here only after it is chosen. Until then everything is `general`, which keeps
// the sub-ID format stable (`niche_article_listing`) without encoding demand that has
// not been audited.
//
// Two kinds of token live here, and the report must not confuse them:
//
//   audience  — `solo`. A claim about *who* is travelling. This is what the 12-week
//               test in docs/strategy.md measures.
//   seasonal  — `offseason`, `timing`. A claim about *when* to travel. A hub choice
//               with a date attached, not an audience.
//
// Both are legitimate pages, but a seasonal token is not evidence that an audience
// niche earns. Read the report with that distinction in hand — see the 2026-11-19
// entry in docs/decision-log.md.
//
// A code must be a single lowercase word — NO underscore. The sub-ID is parsed as
// "first token is the niche, second is the article, the remainder is the listing id",
// so an underscore inside a niche code would silently corrupt every report row.
// `validateNicheCode` enforces that at import time, in the same style as lib/blog.ts:
// a mistake fails the build rather than splitting the report.

export const NICHE_CODES = ["general", "solo", "offseason", "timing"] as const;

export type NicheCode = (typeof NICHE_CODES)[number];

const WORD = /^[a-z0-9]+$/;

// Check the table itself, so a future edit cannot add a bad token without failing.
for (const code of NICHE_CODES) {
  if (!WORD.test(code)) {
    throw new Error(`niche: code "${code}" must be lowercase alphanumeric with no underscore`);
  }
  if (code.length > 12) {
    throw new Error(`niche: code "${code}" must be 12 characters or fewer`);
  }
}

export function isNicheCode(value: unknown): value is NicheCode {
  return typeof value === "string" && (NICHE_CODES as readonly string[]).includes(value);
}

/** The niche a click belongs to when nothing more specific is known. */
export const DEFAULT_NICHE: NicheCode = "general";

/**
 * What kind of claim a token makes. `audience` tokens are what the 12-week test
 * measures; `seasonal` tokens are timing lenses and must not be read as evidence
 * that an audience niche earns.
 */
export const NICHE_KIND: Record<NicheCode, "audience" | "seasonal"> = {
  general: "audience",
  solo: "audience",
  offseason: "seasonal",
  timing: "seasonal",
};

/**
 * Resolve a declared niche to a valid token, or throw.
 *
 * Throwing is correct here: this is only ever called with a value from the blog
 * registry, which is source code. An unknown niche is a typo, and a typo must not
 * become a silent `general` that quietly merges two niches' earnings into one row.
 */
export function requireNiche(value: string): NicheCode {
  if (!isNicheCode(value)) {
    throw new Error(
      `niche: "${value}" is not in NICHE_CODES. Run the audit in docs/niche-audits.md, ` +
        `then add the token here — do not invent one.`
    );
  }
  return value;
}
