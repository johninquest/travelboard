// The platform registry behind /where-to-look: which kind of source carries which
// kind of inventory.
//
// Every field here is a statement about a company's *business model*, which is
// stable for years and checkable on the company's own site. Nothing here is an
// availability claim. "TUI sells its own package inventory" is a fact about TUI.
// "TUI has Crete in November" would be a claim about stock that nobody verified,
// and the project's hardest rule forbids publishing it.
//
// `lastVerified` is the date the business model was read off the company's own
// site. It renders next to each platform, the same way `last_checked` renders on
// an offer, so staleness stays visible rather than implied.

import platformsJson from "@/data/platforms.json";

export const PLATFORM_KINDS = [
  "tour-operator",
  "comparison",
  "deal-feed",
  "accommodation",
  "flight",
] as const;
export type PlatformKind = (typeof PLATFORM_KINDS)[number];

export type Platform = {
  slug: string;
  name: string;
  url: string;
  kind: PlatformKind;
  sells: string;
  limitation: string;
  /** ISO alpha-2 codes this platform is relevant for. Empty means all of them. */
  countries: string[];
  lastVerified: string; // YYYY-MM-DD
};

/** What each kind of source is good for, in one line. Used as a section heading. */
export const KIND_LABEL: Record<PlatformKind, string> = {
  "tour-operator": "Tour operators — one booking covers flight, hotel and transfer",
  comparison: "Comparison sites — many operators in one search",
  "deal-feed": "Deal feeds — editorially picked offers, not a search",
  accommodation: "Accommodation only — you book the flight separately",
  flight: "Flights only — you book the hotel separately",
};

// The order the page presents them in: a package holiday is the board's subject,
// so operators and comparisons come first and the build-it-yourself sources last.
export const KIND_ORDER: PlatformKind[] = [
  "tour-operator",
  "comparison",
  "deal-feed",
  "accommodation",
  "flight",
];

const KIND_SET = new Set<string>(PLATFORM_KINDS);
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function validate(rows: unknown): Platform[] {
  if (!Array.isArray(rows)) {
    throw new Error("data/platforms.json must be a JSON array of platforms");
  }
  const seen = new Set<string>();
  for (const raw of rows as Record<string, unknown>[]) {
    const slug = raw["slug"];
    if (typeof slug !== "string" || !SLUG.test(slug)) {
      throw new Error(`platforms: slug "${String(slug)}" must be lowercase-hyphenated`);
    }
    if (seen.has(slug)) throw new Error(`platforms: duplicate slug "${slug}"`);
    seen.add(slug);

    const kind = raw["kind"];
    if (typeof kind !== "string" || !KIND_SET.has(kind)) {
      throw new Error(
        `platforms: ${slug} kind "${String(kind)}" must be one of ${PLATFORM_KINDS.join(", ")}`
      );
    }

    const url = raw["url"];
    if (typeof url !== "string" || !url.startsWith("https://")) {
      throw new Error(`platforms: ${slug} url must be an https URL`);
    }

    const lastVerified = raw["lastVerified"];
    if (typeof lastVerified !== "string" || !DATE.test(lastVerified)) {
      throw new Error(`platforms: ${slug} lastVerified must be YYYY-MM-DD`);
    }

    // `sells` and `limitation` are the whole content of the page. An empty one
    // would render a platform with no reason to be listed.
    for (const field of ["name", "sells", "limitation"] as const) {
      const value = raw[field];
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`platforms: ${slug} is missing "${field}"`);
      }
    }

    const countries = raw["countries"];
    if (!Array.isArray(countries) || countries.some((c) => typeof c !== "string")) {
      throw new Error(`platforms: ${slug} countries must be an array of ISO alpha-2 codes`);
    }
  }
  return rows as Platform[];
}

const PLATFORMS: Platform[] = validate(platformsJson);

export function allPlatforms(): readonly Platform[] {
  return PLATFORMS;
}

/**
 * Platforms relevant to a destination, in presentation order. A platform with an
 * empty `countries` list applies everywhere.
 */
export function platformsFor(country: string): Platform[] {
  return PLATFORMS.filter((p) => p.countries.length === 0 || p.countries.includes(country)).sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  );
}

/** Group platforms by kind, preserving KIND_ORDER and dropping empty groups. */
export function platformsByKind(country: string): Array<{ kind: PlatformKind; platforms: Platform[] }> {
  const relevant = platformsFor(country);
  return KIND_ORDER.map((kind) => ({
    kind,
    platforms: relevant.filter((p) => p.kind === kind),
  })).filter((group) => group.platforms.length > 0);
}
