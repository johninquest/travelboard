// Google Analytics 4 configuration, in one place.
//
// Nothing here loads a script; that is components/google-analytics.tsx. This module
// exists so the two readers of the flag — the script tag and lib/track.ts — cannot
// disagree about whether GA is on.
//
// Absent ID means GA is entirely absent from the HTML, which keeps the
// zero-configuration default the rest of the project relies on: a fresh clone with
// no env vars renders the board and measures nothing third-party.
//
// CONSENT. There is no cookie banner in this project, deliberately, and that is a
// risk the owner accepted on 2026-11-21 — see docs/decision-log.md. The default here
// is what keeps the risk small: `analytics_storage: "denied"` makes GA4 fall back to
// cookieless measurement, so no Google cookie is read or written and TDDDG §25 (which
// governs *cookie* consent) is not engaged. Page and event counts still arrive, which
// is all the 12-week test needs. User-ID, ad storage and personalisation stay denied
// either way — this board earns from affiliate links, not from Google ad audiences.
//
// To switch to full cookie tracking, set NEXT_PUBLIC_GA_CONSENT=granted *and* ship a
// consent banner with it. Do not do the first without the second.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export const gaEnabled = GA_MEASUREMENT_ID !== "";

/** True unless the operator has explicitly granted cookie consent (and added a banner). */
export const GA_COOKIELESS = process.env.NEXT_PUBLIC_GA_CONSENT !== "granted";

declare global {
  interface Window {
    dataLayer?: unknown[];
    // Optional because it only exists when NEXT_PUBLIC_GA_MEASUREMENT_ID is set, and
    // lib/track.ts must keep working when it isn't. Loose by design: gtag's real
    // signature varies per command, and the only caller is `send()` below.
    gtag?: (...args: unknown[]) => void;
  }
}
