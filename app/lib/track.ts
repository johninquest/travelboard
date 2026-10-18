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
