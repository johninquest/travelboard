import type { Listing } from "@/lib/listing";
import { eur } from "@/lib/listing";

// Compact offer card for the board grid. Facts only — price, duration, route,
// verifiable attributes. Marketing prose is not our voice (copyright guardrail).

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

export function DealCard({ listing }: { listing: Listing }) {
  const price = listing.priceFromEur;
  return (
    <a
      href={`/deal/${listing.slug}`}
      className="group block rounded-card border border-border bg-surface p-5 shadow-card hover:border-border-strong transition-colors"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold leading-snug">
          {listing.destination || listing.title}
        </h3>
        <p className="tnum shrink-0 text-lg font-bold text-primary">
          {price != null ? `ab ${eur(price)}` : "Preis prüfen"}
        </p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{metaLine(listing)}</p>
      <p className="mt-3 text-sm">{dateLine(listing)}</p>
      <p className="mt-3 text-xs text-subtle">
        Quelle: {listing.sourcePublishedAt ? new Date(listing.sourcePublishedAt).toLocaleDateString("de-DE") : "—"}
        {" · "}
        {listing.themes.slice(0, 3).join(", ") || "Pauschalreise"}
      </p>
    </a>
  );
}
