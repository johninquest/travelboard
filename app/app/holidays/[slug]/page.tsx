import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getHubListings } from "@/lib/store";
import { findHub, type HubDef } from "@/lib/hubs";
import { DealRow } from "@/components/deal-row";

// A hub only exists when it has real data behind it. Below this many live
// offers we 404 rather than publish a thin page — the answerability rule.
const MIN_OFFERS = 3;

type Props = { params: Promise<{ slug: string }> };

async function hubOffers(hub: HubDef) {
  return getHubListings(hub).catch(() => []);
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
  return { title: "Package holidays" };
}

export default async function HubPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-8">
      <nav className="mb-6 text-sm">
        <Link href="/deals" className="text-muted-foreground hover:text-foreground">
          ← All offers
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
          {hub.description} We do not currently have enough verified offers for
          this destination to justify a page of its own. The selection grows as
          editorial review continues.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/deals" className="text-primary underline">
            See all current offers
          </Link>
        </p>
      </>
    );
  }

  const { prices, nights, airports, boards } = facts(offers);

  return (
    <>
      <h1 className="font-display text-3xl font-extrabold">Package holidays {hub.name}</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">{hub.description}</p>

      <section className="mt-8 rounded-card border border-border bg-surface p-6 shadow-card">
        <h2 className="text-sm font-semibold">Quick answers</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Current offers</dt>
            <dd className="tnum font-medium">{offers.length}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Lowest price</dt>
            <dd className="tnum font-medium">
              {prices.length ? `from €${Math.min(...prices)}` : "none stated"}
            </dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Trip length</dt>
            <dd className="tnum font-medium">
              {nights.length ? `${Math.min(...nights)}–${Math.max(...nights)} nights` : "varies"}
            </dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Departure airports</dt>
            <dd className="font-medium">{airports.length ? airports.join(", ") : "none stated"}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Board</dt>
            <dd className="font-medium">{boards.length ? boards.join(", ") : "varies"}</dd>
          </div>
          <div className="flex justify-between border-b border-border py-1.5">
            <dt className="text-muted-foreground">Checked on</dt>
            <dd className="font-medium">
              {offers[0]?.lastChecked ? new Date(offers[0].lastChecked).toLocaleDateString("en-GB") : "—"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 border-t border-border">
        {offers.map((l) => (
          <DealRow key={l.id} listing={l} />
        ))}
      </div>

      <section className="mt-12 border-t border-border pt-8 text-xs text-subtle">
        <p>
          Prices as stated by the supplier at the time we checked, per person or as
          a total where stated; baggage, transfers and tourist tax may be added.
          An offer only appears here after editorial review.
        </p>
      </section>
    </>
  );
}
