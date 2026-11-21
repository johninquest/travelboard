import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// What these guard: GA receives exactly one page_view per visit, and silencing GA
// never silences the first-party event.
//
// The page_view case is a regression, not a hypothetical. GA4's Enhanced Measurement
// collects page_view regardless of `send_page_view: false` in the config — verified
// against a production build, where a page whose only GA call was a config with the
// flag off still sent a page_view hit. Forwarding ours on top counted every visit
// twice, which halves the clicks-per-100-visits number the keep/kill rule in
// docs/strategy.md is decided on. The early return in send() is invisible from the GA
// UI, so it needs a test rather than a comment.

type Sent = { url: string; blob: Blob };

function stubBrowser({ withGtag = true }: { withGtag?: boolean } = {}) {
  const sent: Sent[] = [];
  const gtag = vi.fn();
  const store = new Map<string, string>();

  const win: Record<string, unknown> = {
    location: { pathname: "/deals" },
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
    navigator: {
      sendBeacon: (url: string, blob: Blob) => {
        sent.push({ url, blob });
        return true;
      },
    },
  };
  if (withGtag) {
    // window.gtag is defined by the bootstrap script; absent means blocked or unset.
    win.gtag = gtag;
    win.window = win;
  }

  vi.stubGlobal("window", win);
  vi.stubGlobal("navigator", win.navigator);
  vi.stubGlobal("sessionStorage", win.sessionStorage);

  return { sent, gtag };
}

// lib/track.ts reads the Measurement ID at module scope, so each case re-imports.
async function loadTrack(measurementId = "G-TEST1") {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", measurementId);
  return import("./track");
}

async function beacons(sent: Sent[]) {
  return Promise.all(
    sent.map(
      async (s) => JSON.parse(await s.blob.text()) as { name: string; props: Record<string, unknown> }
    )
  );
}

beforeEach(() => {
  vi.stubGlobal("crypto", { randomUUID: () => "test-session" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("GA bridge", () => {
  it("does not forward page_view, because Enhanced Measurement already sends it", async () => {
    const { sent, gtag } = stubBrowser();
    const { trackPageView } = await loadTrack();

    trackPageView("/blog");

    expect(gtag).not.toHaveBeenCalled();
    const rows = await beacons(sent);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("page_view");
    expect(rows[0].props.path).toBe("/blog");
  });

  it("forwards every other funnel event by name", async () => {
    const { gtag } = stubBrowser();
    const { trackDealClick, trackFormSubmit, trackCardView } = await loadTrack();

    trackDealClick("l1");
    trackFormSubmit("find");
    trackCardView("l2");

    expect(gtag.mock.calls.map((c) => c.slice(0, 2))).toEqual([
      ["event", "deal_click"],
      ["event", "form_submit"],
      ["event", "card_view"],
    ]);
    expect(gtag.mock.calls[0][2]).toEqual({ listing: "l1" });
  });

  it("still beacons when gtag never loaded", async () => {
    const { sent } = stubBrowser({ withGtag: false });
    const { trackPageView, trackDealClick } = await loadTrack();

    trackPageView("/");
    trackDealClick("l9");

    const rows = await beacons(sent);
    expect(rows.map((r) => r.name)).toEqual(["page_view", "deal_click"]);
    expect(rows[1].props.listing).toBe("l9");
  });

  it("sends nothing to GA when no Measurement ID is configured", async () => {
    const { gtag, sent } = stubBrowser();
    const { trackDealClick } = await loadTrack("");

    trackDealClick("l1");

    expect(gtag).not.toHaveBeenCalled();
    expect(await beacons(sent)).toHaveLength(1);
  });
});
