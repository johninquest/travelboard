// Affiliate link construction. Pure — no I/O, no imports — so it can be unit
// tested and called from the click route without pulling in the store.
//
// The board stores the *raw* supplier URL. The affiliate wrapper is applied at
// click time, which keeps the stored data honest and re-wrappable if the marker
// changes. With no configuration the builder is a passthrough, so the board
// renders and links out correctly with zero environment variables.
//
// Link shapes are taken from Travelpayouts' own help centre, not from memory:
//   generic   https://tp.media/r?marker=<id>.<subid>&trs=<project>&p=<program>&u=<encoded>
//   kiwi.com  https://c111.travelpayouts.com/click?shmarker=<id>.<subid>&promo_id=3791&...
//
// Two things that are easy to get wrong and are handled here deliberately:
//   - The SubID on a long link is a *dot-suffix on the marker*, not a query
//     parameter. `&sub_id=` is documented only for tp.st short links.
//   - Kiwi.com cannot use tp.media/r at all, and Travelpayouts warns that a
//     Kiwi link without a `deep` destination is not counted and earns nothing.

export type AffiliateNetwork = "travelpayouts" | "direct" | "none";

export type AffiliateConfig = {
  marker: string; // Partner ID (Travelpayouts calls it the marker)
  trs: string; // Project ID
  programs: Record<string, string>; // program key -> program id (`p`)
};

// Program ids confirmed in Travelpayouts' documentation. Anything else has to be
// read off the live program card and passed via TRAVELPAYOUTS_PROGRAMS — we do
// not guess a number, because a wrong `p` silently earns nothing.
export const DEFAULT_PROGRAMS: Record<string, string> = {
  booking: "2076",
  kiwi: "3791",
};

const KIWI_CLICK_HOST = "https://c111.travelpayouts.com/click";
const TP_REDIRECT_HOST = "https://tp.media/r";

// Travelpayouts allows numbers, Latin letters and underscore, up to 4096 chars.
// We cap far lower: the sub-id is a listing id, and a runaway value would only
// make the report unreadable.
const SUB_ID_MAX = 64;

export function sanitizeSubId(raw: string): string {
  return raw
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, SUB_ID_MAX);
}

// "booking:2076,kiwi:3791" -> { booking: "2076", kiwi: "3791" }
function parsePrograms(raw: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  for (const pair of raw.split(",")) {
    const [key, id] = pair.split(":");
    const k = key?.trim();
    const v = id?.trim();
    if (k && v) out[k] = v;
  }
  return out;
}

// Returns null when the site is not configured for affiliate links. Callers must
// treat null as "link out to the supplier directly", never as an error.
export function readAffiliateConfig(
  env: Record<string, string | undefined> = process.env
): AffiliateConfig | null {
  const marker = (env.TRAVELPAYOUTS_MARKER ?? "").trim();
  const trs = (env.TRAVELPAYOUTS_TRS ?? "").trim();
  if (!marker || !trs) return null;
  return {
    marker,
    trs,
    programs: { ...DEFAULT_PROGRAMS, ...parsePrograms(env.TRAVELPAYOUTS_PROGRAMS) },
  };
}

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// encodeURIComponent, not URLSearchParams: the latter encodes a space as "+",
// which some redirectors read back as a literal plus. The documented examples
// use %XX throughout.
function query(params: Array<[string, string]>): string {
  return params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

// Wraps a destination URL in the affiliate redirect for its network. Returns the
// destination unchanged whenever we cannot build a link we trust — an unconfigured
// site, an unknown program, a non-http destination, or a network we do not wrap.
export function buildAffiliateUrl(input: {
  network: string;
  program: string;
  destinationUrl: string;
  subId: string;
  config: AffiliateConfig | null;
}): string {
  const { network, program, destinationUrl, subId, config } = input;
  if (!destinationUrl || !isHttpUrl(destinationUrl)) return destinationUrl;
  if (network !== "travelpayouts" || !config) return destinationUrl;

  const programId = config.programs[program];
  if (!programId) return destinationUrl;

  const sub = sanitizeSubId(subId);
  const marker = sub ? `${config.marker}.${sub}` : config.marker;

  if (program === "kiwi") {
    return `${KIWI_CLICK_HOST}?${query([
      ["shmarker", marker],
      ["promo_id", programId],
      ["source_type", "customlink"],
      ["type", "click"],
      ["custom_url", destinationUrl],
    ])}`;
  }

  return `${TP_REDIRECT_HOST}?${query([
    ["marker", marker],
    ["trs", config.trs],
    ["p", programId],
    ["u", destinationUrl],
  ])}`;
}
