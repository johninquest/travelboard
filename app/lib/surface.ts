// Where an outbound click came from.
//
// The deal page is reached from the board, a hub, an article, or directly. The
// 12-week test in docs/strategy.md cannot be answered without knowing which, because
// "which niche earns" and "which article earns" are only visible if the click carries
// its origin. So links out of a surface add `?from=`, and this module turns that
// untrusted string into an allowlisted value.
//
// The allowlist is the whole point. `from` is URL data, and the value ends up inside
// an affiliate marker suffix. If it were passed through, anyone could append
// `?from=<anything>` to a deal URL and pollute the Travelpayouts report with rows that
// look like real traffic. An unrecognised value therefore becomes `direct` — a real
// surface, and one that carries no attacker-controlled text.
//
// Format of the parameter: `<kind>` or `<kind>_<slug>`, separated by a single
// underscore. Safe because both hub slugs and post slugs are validated as
// lowercase-hyphenated (`[a-z0-9-]`) and so can never contain one.

import { allPosts } from "./blog";
import { ALL_HUBS } from "./hubs";
import { DEFAULT_NICHE, requireNiche, type NicheCode } from "./niche";

export type SurfaceKind = "board" | "hub" | "blog" | "deal" | "direct";

export type ClickOrigin = {
  /** What gets logged. Always one of these five, never the raw string. */
  surface: SurfaceKind;
  /** The hub or post slug, only when it resolved against a registry. */
  ref: string | null;
  /**
   * Niche token for the sub-ID. `DEFAULT_NICHE` off-article: the board is not
   * segmented by niche, so a board click is attributed to the general pool rather
   * than guessed at from the hub.
   */
  niche: NicheCode;
  /** The article's track code, or null when the click did not come from an article. */
  article: string | null;
};

const BARE: Record<string, SurfaceKind> = {
  board: "board",
  deal: "deal",
  direct: "direct",
};

// Widened to string on purpose: the slugs are literal unions, and a Set<PostSlug>
// refuses `.has(someString)`. These are membership tests against untrusted input.
const POST_SLUGS: Set<string> = new Set(allPosts().map((p) => p.slug as string));
const HUB_SLUGS: Set<string> = new Set(ALL_HUBS.map((h) => h.slug));

export function resolveOrigin(raw: string | null | undefined): ClickOrigin {
  const value = (raw ?? "").trim();
  if (!value) return direct();

  const bare = BARE[value];
  if (bare) {
    return { surface: bare, ref: null, niche: DEFAULT_NICHE, article: null };
  }

  const sep = value.indexOf("_");
  if (sep <= 0 || sep === value.length - 1) return direct();
  const kind = value.slice(0, sep);
  const slug = value.slice(sep + 1);

  if (kind === "blog") {
    // Resolve against the registry, and only then read the post's declared niche.
    // A post that names an unknown niche throws from lib/niche.ts at import time,
    // so by here the value is known-good.
    if (!POST_SLUGS.has(slug)) return direct();
    const post = allPosts().find((p) => p.slug === slug)!;
    // Slug is registry-validated above, so the niche is known-good.
    return {
      surface: "blog",
      ref: post.slug,
      niche: requireNiche(post.niche),
      article: post.trackCode,
    };
  }

  if (kind === "hub") {
    if (!HUB_SLUGS.has(slug)) return direct();
    return { surface: "hub", ref: slug, niche: DEFAULT_NICHE, article: null };
  }

  return direct();
}

function direct(): ClickOrigin {
  return { surface: "direct", ref: null, niche: DEFAULT_NICHE, article: null };
}

/**
 * The `from` value for a link leaving a surface. Kept next to the parser so the two
 * cannot drift: if this emits something `resolveOrigin` does not understand, the click
 * silently becomes `direct` and the attribution is lost — which is what the round-trip
 * test in surface.test.ts guards.
 */
export function fromParam(origin: { surface: SurfaceKind; ref?: string | null }): string {
  return origin.ref ? `${origin.surface}_${origin.ref}` : origin.surface;
}

/** Append `?from=` to a `/deal/<slug>` href. Already-encoded values pass through. */
export function withFrom(href: string, from: string | null | undefined): string {
  if (!from) return href;
  return `${href}?from=${from}`;
}
