import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { pbPublic } from "@/lib/pb";
import { recordToListing } from "@/lib/listings-read";
import { findHub, hubFilter, type HubDef } from "@/lib/hubs";
import { DealCard } from "@/components/deal-card";

// A hub only exists when it has real data behind it. Below this many live
// offers we 404 rather than publish a thin page — the answerability rule.
const MIN_OFFERS = 3;

type Props = { params: Promise<{ slug: string }> };

async function hubOffers(hub: HubDef) {
  const pb = pbPublic();
  const records = await pb
    .collection("travel_listings")
    .getFullList({ filter: hubFilter(hub), sort: "-source_published_at", expand: "source", requestKey: null })
    .catch(() => []);
  return records.map(recordToListing);
}

// Explicit answers for the "would ChatGPT have everything it needs" test.
// Ranges are computed from the live offers only — never guessed.
function facts(l: Awaited<ReturnType<typeof hubOffers>>) {
  const prices = l.map((x) => x.priceFromEur).filter((p): p is number => p != null);
  const nights = l.map((x) => x.nights).filter((n): n is number => n != null);
  const airports = [...new Set(l.map((x) => x.departureAirport).filter(Boolean))];
  const boards = [...new Set(l.map((x) => x.accommodation.board).filter((b): b is string => !!b))];
  return { prices, nights, airports, boards };
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Pauschalreisen" };
}

export default async function HubPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-12">
      <nav className="mb-8 text-sm">
        <Link href="/deals" className="text-muted-foreground hover:text-foreground">
          ← Alle Angebote
        </Link>
      </nav>
      {/* params is runtime data under cacheComponents — read only inside Suspense */}
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-card border border-border bg-surface" />}>
        <HubBody params={params} />
      </Suspense>
    </main>
  );
}

async function HubBody({ params }: { params: Props["params"] }) {
  const hub = findHub((await params).slug);
  if (!hub) notFound();
  await connection(); // live board data — never prerendered (cacheComponents)
  const offers = await hubOffers(hub);

  // Not enough real data → no indexable page. Deliberate: thin pages answer
  // nothing and hurt the whole domain.
  if (offers.length < MIN_OFFERS) {
    return (
      <>
        <h1 className="font-display text-2xl font-extrabold">{hub.name}</h1>
        <p className="mt-3 max-w-[70ch] text-sm text-muted-foreground">
          {hub.description} Aktuell haben wir für dieses Ziel nicht genug geprüfte
          Angebote, um eine eigene Seite zu rechtfertigen. Der Bestand wächst mit
          der redaktionellen Prüfung.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/deals" className="text-primary underline">
            Alle aktuellen Angebote ansehen
          </Link>
        </p>
      </>
    );
  }

  const { prices, nights, airports, boards } = facts(offers);

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold">Pauschalreisen {hub.name}</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">{hub.description}</p>

      <section className="mt-8 rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">Schnellantworten</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Aktuelle Angebote</dt>
            <dd className="tnum font-medium">{offers.length}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Niedrigster Preis</dt>
            <dd className="tnum font-medium">
              {prices.length ? `ab ${Math.min(...prices)} €` : "keiner ausgewiesen"}
            </dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Reisedauer</dt>
            <dd className="tnum font-medium">
              {nights.length ? `${Math.min(...nights)}–${Math.max(...nights)} Nächte` : "unterschiedlich"}
            </dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Abflughäfen</dt>
            <dd className="font-medium">{airports.length ? airports.join(", ") : "keiner angegeben"}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Verpflegung</dt>
            <dd className="font-medium">{boards.length ? boards.join(", ") : "variiert"}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Geprüft am</dt>
            <dd className="font-medium">
              {offers[0]?.lastChecked ? new Date(offers[0].lastChecked).toLocaleDateString("de-DE") : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((l) => (
          <DealCard key={l.id} listing={l} />
        ))}
      </div>

      <section className="mt-12 border-t border-border pt-8 text-xs text-subtle">
        <p>
          Preise laut Anbieter zum Prüfzeitpunkt, pro Person oder als Gesamtpreis wie
          ausgewiesen; Gepäck, Transfers und Kurtaxe können hinzukommen. Ein Angebot
          erscheint hier erst nach redaktioneller Prüfung.
        </p>
      </section>
    </>
  );
}
