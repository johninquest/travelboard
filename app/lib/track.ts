"use client";

// Minimal funnel tracking: page_view + form_submit, via sendBeacon.
// No third-party analytics yet — events land in the Pocketbase `events` collection.

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
