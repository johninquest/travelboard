import { Suspense } from "react";
import type { Metadata } from "next";
import { Board, BoardSkeleton, PriceDisclaimer } from "@/components/board";

// Canonical board URL. `/` renders the same board (see app/page.tsx) — this
// route stays because it is in the sitemap and linked from the hubs.

export const metadata: Metadata = {
  title: "Current holiday offers",
  description:
    "Curated package holiday offers departing from German airports: price, trip length, departure airport and travel dates — no fluff.",
};

export default function DealsPage() {
  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-8">
      <h1 className="font-display text-2xl font-extrabold md:text-3xl">
        Current holiday offers
      </h1>
      <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
        An editor checks every offer before it appears here: price verified with
        the supplier, travel dates realistic, departure airports in Germany.
        Found in public travel feeds — you book directly with the tour operator.
      </p>

      <Suspense fallback={<BoardSkeleton />}>
        <Board />
      </Suspense>

      <PriceDisclaimer />
    </main>
  );
}
