import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { decodeEntities, parseDate, parseFeed, stripTags, linksIn } from "./rss";
import { draftFromFeed } from "./feed-extract";
import {
  extractAirport,
  extractBoard,
  extractCategory,
  extractNights,
  extractPriceEur,
  extractThemes,
  extractTravellers,
  extractWindow,
  destinationFrom,
} from "./feed-extract";

const fixtures = (name: string) => readFileSync(new URL(`../test/fixtures/${name}`, import.meta.url), "utf8");

describe("rss parser", () => {
  it("reads the urlaubspiraten fixture", () => {
    const feed = parseFeed(fixtures("urlaubspiraten.xml"));
    expect(feed.title).toMatch(/urlaubspiraten/i);
    expect(feed.items.length).toBe(3);
    const first = feed.items[0];
    expect(first.link).toContain("urlaubspiraten.de/deals/");
    expect(first.guid).toMatch(/^[0-9a-f]{16,}$/);
    expect(first.publishedAt).toMatch(/^2026-/);
    expect(first.title).toContain("Kreta");
  });

  it("skips items with no link or no title", () => {
    const feed = parseFeed(fixtures("urlaubspiraten.xml"));
    // The fixture has 4 <item> blocks; the last has no <title> and must be dropped.
    expect(feed.items.length).toBe(3);
    expect(feed.items.every((i) => i.link && i.title)).toBe(true);
  });

  it("dedupes by guid", () => {
    const xml = fixtures("urlaubspiraten.xml");
    const dup = xml.replace("</rss>", xml.slice(xml.indexOf("<item>"), xml.indexOf("</item>") + 7) + "</rss>");
    expect(parseFeed(dup).items.length).toBe(3);
  });

  it("reads the atom fixture", () => {
    const feed = parseFeed(fixtures("atom.xml"));
    expect(feed.items.length).toBe(2);
    expect(feed.items[1].link).toBe("https://example.org/deals/sizilien");
    expect(feed.items[0].publishedAt).toBe("2026-08-02T07:00:00.000Z");
  });

  it("decodes entities and strips tags without leaking markup", () => {
    expect(decodeEntities("M&amp;T &lt;b&gt; &euro;99 &#8211;")).toBe("M&T <b> €99 –");
    expect(stripTags("<p>7 Nächte &amp; <b>ab 399€</b></p>")).toBe("7 Nächte & ab 399€");
    expect(stripTags("<script>var x='<b>'</script>hi")).toBe("hi");
  });

  it("parses both date formats", () => {
    expect(parseDate("Tue, 04 Aug 2026 07:15:00 GMT")).toMatch(/^2026-08-04T07:15:00/);
    expect(parseDate("2026-08-04T09:00:00+02:00")).toBe("2026-08-04T07:00:00.000Z");
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate(null)).toBeNull();
  });

  it("pulls absolute links out of description html", () => {
    expect(linksIn('<a href="https://www.tui.com/x">TUI</a><a href="/rel">r</a>')).toEqual(["https://www.tui.com/x"]);
  });
});

describe("price extraction", () => {
  it("finds the lowest stated price across formats", () => {
    expect(extractPriceEur("ab 399€ für zwei")).toBe(399);
    expect(extractPriceEur("€ 449 pro Person")).toBe(449);
    expect(extractPriceEur("nur 1299 Euro")).toBe(1299);
    expect(extractPriceEur("ab 649&#8364;")).toBeNull(); // entity form is decoded before parsing, not here
    expect(extractPriceEur("349,-")).toBeNull(); // needs the currency marker
    expect(extractPriceEur("349,- €")).toBe(349);
  });

  it("returns null rather than inventing a number", () => {
    expect(extractPriceEur("toller Urlaub am Meer")).toBeNull();
    expect(extractPriceEur("Flug 12€")).toBeNull(); // below the 40 EUR sanity floor
    expect(extractPriceEur("999999€")).toBeNull();
  });

  it("handles decimal thousands separators", () => {
    expect(extractPriceEur("ab 1.299€")).toBe(1299);
    // 1299,50 rounds half-up: a "from" price must never understate the total.
    expect(extractPriceEur("ab 1299,50€")).toBe(1300);
  });
});

describe("field extraction", () => {
  const text = "7 Nächte im 4,5-Sterne-Hotel Creta Maris, All Inclusive, ab 649€ für 2 Personen, 20.08. - 27.08.2026 ab MUC";

  it("extracts nights, travellers, category, board, airport", () => {
    expect(extractNights(text)).toBe(7);
    expect(extractNights("5 ÜN auf Kos")).toBe(5);
    expect(extractTravellers(text)).toBe(2);
    expect(extractCategory(text)).toBe(4.5);
    expect(extractCategory("3 Sonnen")).toBe(3);
    expect(extractBoard(text)).toBe("all inclusive");
    expect(extractBoard("mit Halbpension")).toBe("half board");
    expect(extractAirport(text)).toBe("MUC");
    expect(extractAirport("ab München")).toBeNull();
  });

  it("maps themes onto the schema's allowed values", () => {
    expect(extractThemes(text)).toContain("all-inclusive");
    expect(extractThemes("Städtereise Rom, 2 Nächte")).toEqual(expect.arrayContaining(["city"]));
    expect(extractThemes("nichts Relevantes")).toEqual([]);
  });

  it("parses travel windows and rejects nonsense", () => {
    expect(extractWindow(text, null)).toEqual({ start: "2026-08-20", end: "2026-08-27", label: "20.08. – 27.08." });
    expect(extractWindow("27.08. - 20.08.2026", null)).toBeNull();
    expect(extractWindow("irgendwann im Sommer", null)).toBeNull();
    expect(extractWindow("15.03. - 22.03.", "2026-02-01T00:00:00.000Z")?.start).toBe("2026-03-15");
  });

  it("resolves destinations to a country code", () => {
    expect(destinationFrom("All Inclusive auf Kreta")).toEqual({ destination: "Crete", country: "GR" });
    expect(destinationFrom("Strandurlaub in der Türkei")).toBeNull();
  });
});

describe("draftFromFeed", () => {
  it("produces a needs_review draft, never a live one", () => {
    const feed = parseFeed(fixtures("urlaubspiraten.xml"));
    const now = new Date("2026-08-04T12:00:00Z");
    const draft = draftFromFeed(feed.items[0], now);

    expect(draft.status).toBe("needs_review");
    expect(draft.confidence).toBe("feed");
    expect(draft.slug).toMatch(/^crete-.*-20260804$/);
    expect(draft.price_from_eur).toBe(649);
    expect(draft.nights).toBe(7);
    expect(draft.destination).toBe("Crete");
    expect(draft.country).toBe("GR");
    expect(draft.departure_airport).toBe("MUC");
    expect(draft.travel_window).toEqual({ start: "2026-08-20", end: "2026-08-27", label: "20.08. – 27.08." });
    expect(draft.summary).toBe("Crete · 7 nights · all inclusive · from €649");
    expect(draft.notes).toMatch(/unverified/i);
    // The fixture's €8364 entity arrives decoded through stripTags, so the price is found.
    expect(draft.booking_url).toBe("https://www.urlaubspiraten.de/deals/kreta-all-inclusive-august");
    expect(draft.last_checked).toBe(now.toISOString());
  });

  it("keeps unknown facts null instead of guessing", () => {
    const feed = parseFeed(fixtures("urlaubspiraten.xml"));
    const sparse = feed.items.find((i) => i.title.includes("Lissabon"))!;
    const draft = draftFromFeed(sparse, new Date("2026-08-04T12:00:00Z"));
    expect(draft.price_from_eur).toBeNull();
    expect(draft.nights).toBeNull();
    expect(draft.country).toBe("PT");
    expect(draft.summary).toContain("check price");
  });
});
