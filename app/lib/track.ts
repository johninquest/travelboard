"use client";

// Minimal funnel tracking: page_view + form_submit + card/deal events.
// Two sinks, one call site:
//   - POST /api/track -> PocketBase `travel_events` (first-party, carries session_id
//     so page_view -> click can be joined; the source of truth for the 12-week test)
//   - window.gtag -> GA4, when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
// Deliberately in one `send()` so the two cannot drift apart. GA is a convenience
// dashboard over the same events, never a second definition of what a visit is.

import { gaEnabled } from "./analytics";

function sessionId(): string {
  let id = sessionStorage.getItem("sid");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("sid", id);
  }
  return id;
}

function send(name: string, props: Record<string, unknown> = {}) {
  const payload = JSON.stringify({ name, props, sessionId: sessionId() });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
  } else {
    fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => {});
  }

  // GA has its own consent state, so it is guarded separately from the beacon: a
  // blocked or absent gtag must never stop the first-party event from being sent.
  if (!gaEnabled || typeof window.gtag !== "function") return;

  // Page views are GA's job, not ours. `send_page_view: false` in the config does not
  // suppress them: GA4's Enhanced Measurement collects page_view independently of the
  // tag, and it cannot be turned off from the snippet. Verified 2026-11-21 against a
  // production build — an isolated page that sent config only, with no custom event,
  // still produced a page_view hit. Forwarding ours on top of that counted every visit
  // twice, which matters more than it looks: the keep/kill rule is clicks per 100
  // visits, so a doubled visit count halves the measured rate.
  //
  // So GA reports Enhanced Measurement's page views, and this beacon remains the
  // first-party record. They will not agree exactly — EM follows history changes and
  // this fires once per document load — which is another reason travel_events, not GA,
  // is the source of truth for the test.
  if (name === "page_view") return;

  // Cookieless mode discards the client id on Google's side, so nothing here carries
  // a cross-session identifier; session_id stays in the first-party store.
  window.gtag("event", name, props);
}

export function trackPageView(path: string) {
  send("page_view", { path });
}

export function trackFormSubmit(source: "find" | "beat") {
  send("form_submit", { source });
}

// Board funnel: card impressions + outbound clicks (server logs the click too;
// this client event carries the session so page_view -> click can be joined).
export function trackCardView(listingId: string) {
  send("card_view", { listing: listingId });
}

export function trackDealClick(listingId: string) {
  send("deal_click", { listing: listingId });
}
