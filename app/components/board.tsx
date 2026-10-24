import Link from "next/link";
import { connection } from "next/server";
import { getLiveListings, type BoardFilter } from "@/lib/store";
import { DealRow } from "@/components/deal-row";

// The board itself. Rendered by both `/` (the front door) and `/deals` (the
// canonical board URL) so the two can never drift apart.
//
// Server-rendered on purpose: the facts (price, nights, airport, dates) must be
// in the initial HTML, never behind a click → spinner → API call.

export function BoardSkeleton() {
  return (
    <div className="mt-6 flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-(--radius-card) border border-border bg-surface" />
      ))}
    </div>
  );
}

export async function Board({ filter = {} }: { filter?: BoardFilter }) {
  await connection(); // live board data — never prerendered (cacheComponents)
  const listings = await getLiveListings(filter).catch(() => []);

  if (listings.length === 0) {
    return (
      <div className="mt-6 rounded-(--radius-card) border border-border bg-surface-warm p-6 text-sm text-muted-foreground">
        No live offers yet. The feed worker imports candidates for editorial
        review —{" "}
        <Link href="/anfrage" className="text-primary underline">
          interested in a destination? Tell us
        </Link>
        .
      </div>
    );
  }

  return (
    <>
      <p className="mt-4 text-sm text-subtle">{listings.length} offers</p>
      <div className="mt-2 border-t border-border">
        {listings.map((l) => (
          <DealRow key={l.id} listing={l} />
        ))}
      </div>
    </>
  );
}

// PAngV 3(1): a price is never shown as a bare number. This statement sits under
// every board surface.
export function PriceDisclaimer() {
  return (
    <section className="mt-10 border-t border-border pt-6 text-xs text-subtle">
      <p>
        Prices as stated by the supplier; the date we checked is shown on each
        offer. All prices are per person or as a total, exactly as the supplier
        states them; surcharges for luggage, transfers or tourist taxes may
        apply. Offers carrying an affiliate label are marked as such.
      </p>
    </section>
  );
}
