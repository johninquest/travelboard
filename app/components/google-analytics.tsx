import Script from "next/script";
import { GA_MEASUREMENT_ID, GA_COOKIELESS } from "@/lib/analytics";

// Three scripts, all inert until NEXT_PUBLIC_GA_MEASUREMENT_ID is set: consent
// defaults (beforeInteractive, so they land before Google's tag can fire), the tag,
// then the config.
//
// `send_page_view: false` is not an oversight. Page views are emitted by
// lib/track.ts via trackPageView(), which is the single measurement point for the
// whole funnel. Letting gtag send its own would double every visit in the report and
// put the number on two code paths instead of one.
//
// Inlined strings are interpolated from a module-scope env var only — no request
// data reaches them.

const CONSENT_DEFAULT = `
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
window.gtag = gtag;
`;

const CONFIG = `
gtag("js", new Date());
gtag("config", ${JSON.stringify(GA_MEASUREMENT_ID)}, { send_page_view: false });
`;

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script id="ga-consent-default" strategy="beforeInteractive">
        {CONSENT_DEFAULT}
      </Script>
      <Script
        id="ga4-tag"
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-config" strategy="afterInteractive">
        {CONFIG}
      </Script>
    </>
  );
}
