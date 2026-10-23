import type { Listing } from "@/lib/listing";
import { eur } from "@/lib/listing";

// Dense list row for the board. The board is a listings board, not a card
// gallery: one offer per row, facts on three tight lines, no marketing prose
// (copyright guardrail — we never republish the supplier's wording).

function metaLine(l: Listing): string {
  const bits: string[] = [];
  if (l.nights) bits.push(`${l.nights} Nächte`);
  if (l.accommodation.board) bits.push(l.accommodation.board);
  if (l.accommodation.category) bits.push(`${l.accommodation.category}★`);
  if (l.departureAirport) bits.push(`ab ${l.departureAirport}`);
  return bits.join(" · ");
}

function dateLine(l: Listing): string {
  const w = l.travelWindow;
  if (!w) return "Termin beim Anbieter prüfen";
  if (w.label) return w.label;
  if (w.start && w.end) return `${w.start} – ${w.end}`;
  return "Zeitraum beim Anbieter prüfen";
}

export function DealRow({ listing }: { listing: Listing }) {
  const price = listing.priceFromEur;
  const source = listing.sourcePublishedAt
    ? new Date(listing.sourcePublishedAt).toLocaleDateString("de-DE")
    : "—";
  const themes = listing.themes.slice(0, 3).join(", ") || "Pauschalreise";

  return (
    <a
      href={`/deal/${listing.slug}`}
      className="group block border-b border-border px-1 py-3 transition-colors hover:bg-surface-warm"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-display text-base font-bold leading-snug group-hover:text-primary">
          {listing.destination || listing.title}
        </h3>
        <p className="tnum shrink-0 text-base font-bold text-primary">
          {price != null ? `ab ${eur(price)}` : "Preis prüfen"}
        </p>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{metaLine(listing)}</p>
      <p className="mt-0.5 text-xs text-subtle">
        {dateLine(listing)} · Quelle: {source} · {themes}
      </p>
    </a>
  );
}
