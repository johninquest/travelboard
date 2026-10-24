// Hub taxonomy for /holidays/<dimension> pages. Deliberately static and small:
// a hub exists only when there is real data behind it (>= 3 live offers, enforced
// by the page, not here). Adding a dimension means adding offers first, not URLs.

export type HubKind = "country" | "airport" | "theme" | "month";

export type HubDef = {
  kind: HubKind;
  slug: string; // URL segment
  name: string; // display name
  description: string; // one honest sentence used in metadata + page intro
};

// Code maps live above the filter that uses them (single source of truth).
export const COUNTRY_CODES: Record<string, string[]> = {
  spain: ["ES"],
  greece: ["GR"],
  turkey: ["TR"],
  portugal: ["PT"],
  italy: ["IT"],
  cyprus: ["CY"],
  malta: ["MT"],
};

const AIRPORT_CODES: Record<string, string> = {
  munich: "MUC",
  nuremberg: "NUE",
  stuttgart: "STR",
  frankfurt: "FRA",
};

const MONTH_NUM: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

export const COUNTRY_HUBS: HubDef[] = [
  { kind: "country", slug: "spain", name: "Spain", description: "Mainland, Balearics and Canaries — from the Costa Blanca to Tenerife." },
  { kind: "country", slug: "greece", name: "Greece", description: "Crete, Kos, Rhodes, Corfu and Santorini with direct flights from German airports." },
  { kind: "country", slug: "turkey", name: "Turkey", description: "Turkish Riviera, Bodrum and Fethiye — often the best value for all-inclusive." },
  { kind: "country", slug: "portugal", name: "Portugal", description: "Algarve, Lisbon and Madeira." },
  { kind: "country", slug: "italy", name: "Italy", description: "Sardinia, Sicily, Puglia and the Adriatic coast around Rimini." },
  { kind: "country", slug: "cyprus", name: "Cyprus", description: "A long beach season — Ayia Napa and Paphos." },
  { kind: "country", slug: "malta", name: "Malta", description: "A small island, short flights, city and beach in one trip." },
];

export const AIRPORT_HUBS: HubDef[] = [
  { kind: "airport", slug: "munich", name: "Munich (MUC)", description: "Package holiday departures from Munich." },
  { kind: "airport", slug: "nuremberg", name: "Nuremberg (NUE)", description: "Package holiday departures from Nuremberg." },
  { kind: "airport", slug: "stuttgart", name: "Stuttgart (STR)", description: "Package holiday departures from Stuttgart." },
  { kind: "airport", slug: "frankfurt", name: "Frankfurt (FRA)", description: "Package holiday departures from Frankfurt." },
];

export const THEME_HUBS: HubDef[] = [
  { kind: "theme", slug: "beach", name: "Beach holidays", description: "Offers where the beach is the point." },
  { kind: "theme", slug: "all-inclusive", name: "All inclusive", description: "Board included throughout — total cost you can plan for." },
  { kind: "theme", slug: "city", name: "City breaks", description: "Short flights, city programme, usually 3–5 nights." },
  { kind: "theme", slug: "family", name: "Family holidays", description: "Offers that state child prices or family rooms." },
  { kind: "theme", slug: "romance", name: "Couples & honeymoon", description: "Romantic destinations with adult-only options." },
  { kind: "theme", slug: "last-minute", name: "Last minute", description: "Departure within the next few weeks, usually discounted." },
];

export const MONTH_HUBS: HubDef[] = [
  ["january", "January"], ["february", "February"], ["march", "March"], ["april", "April"],
  ["may", "May"], ["june", "June"], ["july", "July"], ["august", "August"],
  ["september", "September"], ["october", "October"], ["november", "November"], ["december", "December"],
].map(([slug, name]) => ({
  kind: "month" as HubKind,
  slug,
  name,
  description: `Holiday offers departing in ${name}.`,
}));

// The hub slugs were German before the site moved to English. These are kept so
// next.config.ts can permanently redirect the old URLs instead of dropping the
// signal they accumulated.
export const LEGACY_HUB_SLUGS: Record<string, string> = {
  spanien: "spain",
  griechenland: "greece",
  tuerkei: "turkey",
  italien: "italy",
  zypern: "cyprus",
  januar: "january",
  februar: "february",
  maerz: "march",
  mai: "may",
  juni: "june",
  juli: "july",
  oktober: "october",
  dezember: "december",
};

export const ALL_HUBS: HubDef[] = [...COUNTRY_HUBS, ...AIRPORT_HUBS, ...THEME_HUBS, ...MONTH_HUBS];

const BY_SLUG = new Map(ALL_HUBS.map((h) => [h.slug, h]));

export function findHub(slug: string): HubDef | null {
  return BY_SLUG.get(slug) ?? null;
}

// The fields a hub decision needs. Structural, so `Listing` satisfies it without
// this module having to import the model.
export type HubListing = {
  country: string;
  departureAirport: string;
  themes: string[];
  travelWindow: { start?: string } | null;
};

// Does this offer belong to this hub? Kept here so the page, the sitemap and the
// JSON endpoints agree on what "belongs to a hub" means. The caller is
// responsible for the `status === "live"` part.
export function hubMatches(hub: HubDef, l: HubListing): boolean {
  switch (hub.kind) {
    case "country":
      return (COUNTRY_CODES[hub.slug] ?? []).includes(l.country);
    case "airport":
      return l.departureAirport === AIRPORT_CODES[hub.slug];
    case "theme":
      // Exact match against the fixed theme vocabulary in LISTING_SELECT_VALUES.
      return l.themes.includes(hub.slug);
    case "month": {
      const mm = String(MONTH_NUM[hub.slug]).padStart(2, "0");
      // travel_window.start is a YYYY-MM-DD string. The month repeats every
      // year, so match on the "-MM-" segment; the year bounds keep it sane.
      const start = l.travelWindow?.start;
      if (!start) return false;
      return start >= `2000-${mm}-01` && start < `2100-${mm}-01`;
    }
  }
}
