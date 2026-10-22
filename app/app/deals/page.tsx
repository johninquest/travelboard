import Link from "next/link";
import type { Metadata } from "next";
import { getLiveListings } from "@/lib/board";
import { DealCard } from "@/components/deal-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aktuelle Reiseangebote",
  description:
    "Kuratierte Pauschalreise-Angebote für deutsche Abflughäfen: Preis, Reisedauer, Abflughafen und Reisezeitraum — ohne Fluff.",
};

export default async function DealsPage() {
  const listings = await getLiveListings().catch(() => []);

  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-12">
      <nav className="mb-8 flex items-center justify-between text-sm">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          ← sunwise.
        </Link>
        <span className="text-subtle">{listings.length} Angebote</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold">Aktuelle Reiseangebote</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
        Ein Redakteur prüft jedes Angebot, bevor es hier erscheint: Preis beim
        Anbieter verifiziert, Reisedaten realistisch, Abflughäfen in Deutschland.
        Gefunden in öffentlichen Reise-Feeds — Buchung direkt beim Veranstalter.
      </p>

      {listings.length === 0 ? (
        <div className="mt-10 rounded-card border border-border bg-surface-warm p-8 text-sm text-muted-foreground">
          Noch keine live geschalteten Angebote. Der Feed-Worker importiert
          Kandidaten zur redaktionellen Prüfung —{" "}
          <Link href="/contact" className="text-primary underline">
            Interesse an einem Ziel? Schreib uns
          </Link>
          .
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <DealCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      <section className="mt-12 border-t border-border pt-8 text-xs text-subtle">
        <p>
          Preise laut Anbieter, Stand der Prüfung siehe Angebot. Alle Preise pro
          Person bzw. als Gesamtpreis wie beim Anbieter ausgewiesen; Zuschläge für
          Gepäck, Transfers oder Touristenabgaben können hinzukommen. Angebote mit
          Affiliate-Kennzeichnung sind als solche markiert.
        </p>
      </section>
    </main>
  );
}
