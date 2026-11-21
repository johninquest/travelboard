import Script from "next/script";
import { GA_MEASUREMENT_ID, GA_COOKIELESS } from "@/lib/analytics";

// Two scripts, both inert until NEXT_PUBLIC_GA_MEASUREMENT_ID is set: consent
// defaults *and* config inline in one beforeInteractive script, then the tag itself.
//
// Config belongs in the beforeInteractive script, not in a separate afterInteractive
// one. PageViewTracker's effect can push its first `page_view` before an
// afterInteractive script has run, and gtag replays the dataLayer in queue order —
// so a late config never gated the initial view and every visit was counted twice.
// Verified against a production build on 2026-11-21: two hits, one with no `dp`
// (GA's own automatic page view) and one with `dp=/` (ours). Config queued first
// makes `send_page_view: false` actually apply.
//
// `send_page_view: false` is the point of all this. App Router navigations do not
// reload the document, so GA's automatic page view misses client-side moves while
// double-counting the rest. Page views come from lib/track.ts, one measurement point
// for the whole funnel — which matters because the 12-week test's keep/kill rule is
// clicks per 100 visits, and a 2× visit count halves that rate.
//
// Inlined strings are interpolated from a module-scope env var only — no request
// data reaches them.

const BOOTSTRAP = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  analytics_storage: ${JSON.stringify(GA_COOKIELESS ? "denied" : "granted")}
});
gtag("js", new Date());
gtag("config", ${JSON.stringify(GA_MEASUREMENT_ID)}, { send_page_view: false });
window.gtag = gtag;
`;

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script id="ga-bootstrap" strategy="beforeInteractive">
        {BOOTSTRAP}
      </Script>
      <Script
        id="ga4-tag"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
        strategy="afterInteractive"
      />
    </>
  );
}
