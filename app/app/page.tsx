import { Suspense } from "react";
import type { Metadata } from "next";
import { Board, BoardSkeleton, PriceDisclaimer } from "@/components/board";

// The front door IS the board. The V0 decision-product landing page moved to
// /anfrage — the board is the product, so it gets the homepage.

export const metadata: Metadata = {
  title: "Aktuelle Reiseangebote",
  description:
    "Kuratierte Pauschalreise-Angebote für deutsche Abflughäfen: Preis, Reisedauer, Abflughafen und Reisezeitraum — ohne Fluff.",
};

export default function Home() {
  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-8">
      <h1 className="font-display text-2xl font-extrabold md:text-3xl">
        Aktuelle Reiseangebote
      </h1>
      <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
        Ein Redakteur prüft jedes Angebot, bevor es hier erscheint: Preis beim
        Anbieter verifiziert, Reisedaten realistisch, Abflughäfen in Deutschland.
        Gefunden in öffentlichen Reise-Feeds — Buchung direkt beim Veranstalter.
      </p>

      <Suspense fallback={<BoardSkeleton />}>
        <Board />
      </Suspense>

      <PriceDisclaimer />
    </main>
  );
}
