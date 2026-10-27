import { describe, expect, it } from "vitest";
import {
  buildAffiliateUrl,
  readAffiliateConfig,
  sanitizeSubId,
  type AffiliateConfig,
} from "@/lib/affiliate";

const config: AffiliateConfig = {
  marker: "123456",
  trs: "197987",
  programs: { booking: "2076", kiwi: "3791" },
};

const DEST = "https://www.booking.com/hotel/es/playa.html";

function build(over: Partial<Parameters<typeof buildAffiliateUrl>[0]> = {}) {
  return buildAffiliateUrl({
    network: "travelpayouts",
    program: "booking",
    destinationUrl: DEST,
    subId: "listing-001",
    config,
    ...over,
  });
}

describe("readAffiliateConfig", () => {
  it("returns null when the marker or project id is missing", () => {
    expect(readAffiliateConfig({})).toBeNull();
    expect(readAffiliateConfig({ TRAVELPAYOUTS_MARKER: "1" })).toBeNull();
    expect(readAffiliateConfig({ TRAVELPAYOUTS_TRS: "2" })).toBeNull();
  });

  it("returns null when either value is blank", () => {
    expect(readAffiliateConfig({ TRAVELPAYOUTS_MARKER: "  ", TRAVELPAYOUTS_TRS: "2" })).toBeNull();
  });

  it("reads the marker and project id", () => {
    const c = readAffiliateConfig({ TRAVELPAYOUTS_MARKER: "123456", TRAVELPAYOUTS_TRS: "197987" });
    expect(c?.marker).toBe("123456");
    expect(c?.trs).toBe("197987");
  });

  it("ships the documented program ids by default", () => {
    const c = readAffiliateConfig({ TRAVELPAYOUTS_MARKER: "1", TRAVELPAYOUTS_TRS: "2" });
    expect(c?.programs.booking).toBe("2076");
    expect(c?.programs.kiwi).toBe("3791");
  });

  it("lets TRAVELPAYOUTS_PROGRAMS add and override programs", () => {
    const c = readAffiliateConfig({
      TRAVELPAYOUTS_MARKER: "1",
      TRAVELPAYOUTS_TRS: "2",
      TRAVELPAYOUTS_PROGRAMS: "getyourguide:9999,booking:1111",
    });
    expect(c?.programs.getyourguide).toBe("9999");
    expect(c?.programs.booking).toBe("1111");
    expect(c?.programs.kiwi).toBe("3791");
  });

  it("ignores malformed program pairs", () => {
    const c = readAffiliateConfig({
      TRAVELPAYOUTS_MARKER: "1",
      TRAVELPAYOUTS_TRS: "2",
      TRAVELPAYOUTS_PROGRAMS: "nonsense,,:5,ok:7",
    });
    expect(c?.programs.ok).toBe("7");
    expect(c?.programs.nonsense).toBeUndefined();
  });
});

describe("sanitizeSubId", () => {
  it("keeps the allowed charset", () => {
    expect(sanitizeSubId("listing_001")).toBe("listing_001");
  });

  it("replaces illegal characters with underscore", () => {
    expect(sanitizeSubId("urlaubspiraten-kreta-2026")).toBe("urlaubspiraten_kreta_2026");
    expect(sanitizeSubId("a b/c?d=1")).toBe("a_b_c_d_1");
  });

  it("trims leading and trailing underscores", () => {
    expect(sanitizeSubId("--abc--")).toBe("abc");
  });

  it("caps the length", () => {
    expect(sanitizeSubId("x".repeat(500)).length).toBe(64);
  });
});

describe("buildAffiliateUrl — travelpayouts generic", () => {
  it("uses the tp.media/r redirect host", () => {
    expect(build().startsWith("https://tp.media/r?")).toBe(true);
  });

  it("carries marker, trs, p and u", () => {
    const url = new URL(build());
    expect(url.searchParams.get("trs")).toBe("197987");
    expect(url.searchParams.get("p")).toBe("2076");
    expect(url.searchParams.get("u")).toBe(DEST);
  });

  it("appends the sub-id as a dot-suffix on the marker, not a query param", () => {
    const url = new URL(build());
    expect(url.searchParams.get("marker")).toBe("123456.listing_001");
    // &sub_id= is documented only for tp.st short links — it must not appear here.
    expect(url.searchParams.get("sub_id")).toBeNull();
    expect(build()).not.toContain("sub_id=");
  });

  it("omits the dot-suffix when the sub-id sanitizes to nothing", () => {
    const url = new URL(build({ subId: "---" }));
    expect(url.searchParams.get("marker")).toBe("123456");
  });

  it("percent-encodes the destination", () => {
    const raw = build();
    expect(raw).toContain("u=https%3A%2F%2Fwww.booking.com%2F");
    expect(raw).not.toContain("u=https://");
  });

  it("encodes a space as %20, never as +", () => {
    const raw = build({ destinationUrl: "https://example.com/a b" });
    expect(raw).toContain("%20");
    expect(raw).not.toContain("+");
  });
});

describe("buildAffiliateUrl — kiwi", () => {
  const kiwiDest = "https://www.kiwi.com/deep?from=MUC&to=HER&departure=2026-11-09";

  it("uses the click host, not tp.media/r", () => {
    const raw = build({ program: "kiwi", destinationUrl: kiwiDest });
    expect(raw.startsWith("https://c111.travelpayouts.com/click?")).toBe(true);
    expect(raw).not.toContain("tp.media");
  });

  it("carries shmarker, promo_id, source_type, type and custom_url", () => {
    const url = new URL(build({ program: "kiwi", destinationUrl: kiwiDest }));
    expect(url.searchParams.get("shmarker")).toBe("123456.listing_001");
    expect(url.searchParams.get("promo_id")).toBe("3791");
    expect(url.searchParams.get("source_type")).toBe("customlink");
    expect(url.searchParams.get("type")).toBe("click");
    expect(url.searchParams.get("custom_url")).toBe(kiwiDest);
  });

  it("keeps the deep destination, which is what makes the click countable", () => {
    expect(build({ program: "kiwi", destinationUrl: kiwiDest })).toContain("deep");
  });
});

describe("buildAffiliateUrl — passthrough", () => {
  it("returns the destination when there is no config", () => {
    expect(build({ config: null })).toBe(DEST);
  });

  it("returns the destination for a non-travelpayouts network", () => {
    expect(build({ network: "none" })).toBe(DEST);
    expect(build({ network: "direct" })).toBe(DEST);
    expect(build({ network: "check24" })).toBe(DEST);
  });

  it("returns the destination for an unknown program", () => {
    expect(build({ program: "unknownbrand" })).toBe(DEST);
    expect(build({ program: "" })).toBe(DEST);
  });

  it("returns the destination when the program has no id", () => {
    expect(build({ config: { ...config, programs: {} } })).toBe(DEST);
  });

  it("returns the destination unchanged when it is not an http(s) URL", () => {
    expect(build({ destinationUrl: "" })).toBe("");
    expect(build({ destinationUrl: "not a url" })).toBe("not a url");
    expect(build({ destinationUrl: "javascript:alert(1)" })).toBe("javascript:alert(1)");
  });

  it("never throws on a malformed destination", () => {
    expect(() => build({ destinationUrl: "http://" })).not.toThrow();
  });
});
