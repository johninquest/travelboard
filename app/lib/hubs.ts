// Hub taxonomy for /holidays/<dimension> pages. Deliberately static and small:
// a hub exists only when there is real data behind it (>= 3 live offers, enforced
// by the page, not here). Adding a dimension means adding offers first, not URLs.

export type HubKind = "country" | "airport" | "theme" | "month";

export type HubDef = {
  kind: HubKind;
  slug: string; // URL segment
  name: string; // display name (German)
  description: string; // one honest sentence used in metadata + page intro
};

// Code maps live above the filter that uses them (single source of truth).
export const COUNTRY_CODES: Record<string, string[]> = {
  spanien: ["ES"],
  griechenland: ["GR"],
  tuerkei: ["TR"],
  portugal: ["PT"],
  italien: ["IT"],
  zypern: ["CY"],
  malta: ["MT"],
};

const AIRPORT_CODES: Record<string, string> = {
  munich: "MUC",
  nuremberg: "NUE",
  stuttgart: "STR",
  frankfurt: "FRA",
};

const MONTH_NUM: Record<string, number> = {
  januar: 1, februar: 2, maerz: 3, april: 4, mai: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
};

export const COUNTRY_HUBS: HubDef[] = [
  { kind: "country", slug: "spanien", name: "Spanien", description: "Festland, Balearen und Kanaren — von der Costa Blava bis Tenerifa." },
  { kind: "country", slug: "griechenland", name: "Griechenland", description: "Kreta, Kos, Rhodos, Korfu und Santorin mit Direktflügen ab deutschen Flughäfen." },
  { kind: "country", slug: "tuerkei", name: "Türkei", description: "Türkische Riviera, Bodrum und Fethiye — oft das beste Preis-Leistungs-Verhältnis für All Inclusive." },
  { kind: "country", slug: "portugal", name: "Portugal", description: "Algarve, Lissabon und Madeira." },
  { kind: "country", slug: "italien", name: "Italien", description: "Sardinien, Sizilien, Puglia und die Adriaküste um Rimini." },
  { kind: "country", slug: "zypern", name: "Zypern", description: "Badeurlaub mit langer Saison — Ayia Napa und Paphos." },
  { kind: "country", slug: "malta", name: "Malta", description: "Kleine Insel, kurze Flüge, Stadt und Strand in einem Urlaub." },
];

export const AIRPORT_HUBS: HubDef[] = [
  { kind: "airport", slug: "munich", name: "München (MUC)", description: "Pauschalreise-Abflüge ab München." },
  { kind: "airport", slug: "nuremberg", name: "Nürnberg (NUE)", description: "Pauschalreise-Abflüge ab Nürnberg." },
  { kind: "airport", slug: "stuttgart", name: "Stuttgart (STR)", description: "Pauschalreise-Abflüge ab Stuttgart." },
  { kind: "airport", slug: "frankfurt", name: "Frankfurt (FRA)", description: "Pauschalreise-Abflüge ab Frankfurt." },
];

export const THEME_HUBS: HubDef[] = [
  { kind: "theme", slug: "beach", name: "Strand & Badeurlaub", description: "Angebote mit Strand als Schwerpunkt." },
  { kind: "theme", slug: "all-inclusive", name: "All Inclusive", description: "Verpflegung rundum inklusive — planbare Gesamtkosten." },
  { kind: "theme", slug: "city", name: "Städtereise", description: "Kurze Flüge, Stadtprogramm, meist 3–5 Nächte." },
  { kind: "theme", slug: "family", name: "Familienurlaub", description: "Angebote, die Kinderpreise oder Familienzimmer ausweisen." },
  { kind: "theme", slug: "romance", name: "Zweit / Honeymoon", description: "Romantische Ziele mit Adult-Orientierung." },
  { kind: "theme", slug: "last-minute", name: "Last Minute", description: "Abreise in den nächsten Wochen, meist reduziert." },
];

export const MONTH_HUBS: HubDef[] = [
  ["januar", "Januar"], ["februar", "Februar"], ["maerz", "März"], ["april", "April"],
  ["mai", "Mai"], ["juni", "Juni"], ["juli", "Juli"], ["august", "August"],
  ["september", "September"], ["oktober", "Oktober"], ["november", "November"], ["dezember", "Dezember"],
].map(([slug, name]) => ({
  kind: "month" as HubKind,
  slug,
  name,
  description: `Reiseangebote mit Abreise im ${name}.`,
}));

export const ALL_HUBS: HubDef[] = [...COUNTRY_HUBS, ...AIRPORT_HUBS, ...THEME_HUBS, ...MONTH_HUBS];

const BY_SLUG = new Map(ALL_HUBS.map((h) => [h.slug, h]));

export function findHub(slug: string): HubDef | null {
  return BY_SLUG.get(slug) ?? null;
}

// Pocketbase filter for the live offers of one hub. Kept here so the page, the
// sitemap and any JSON endpoint agree on what "belongs to a hub" means.
export function hubFilter(hub: HubDef): string {
  switch (hub.kind) {
    case "country": {
      const codes = COUNTRY_CODES[hub.slug];
      return `status = "live" && country in [${codes.map((c) => `"${c}"`).join(",")}]`;
    }
    case "airport":
      return `status = "live" && departure_airport = "${AIRPORT_CODES[hub.slug]}"`;
    case "theme":
      return `status = "live" && themes ~ "${hub.slug}"`;
    case "month": {
      const mm = String(MONTH_NUM[hub.slug]).padStart(2, "0");
      // travel_window.start is a YYYY-MM-DD string. The month repeats every
      // year, so match on the "-MM-" segment; the year bounds keep it sane.
      return `status = "live" && travel_window != null && travel_window.start >= "2000-${mm}-01" && travel_window.start < "2100-${mm}-01"`;
    }
  }
}
