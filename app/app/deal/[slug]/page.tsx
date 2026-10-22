import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getLiveListingBySlug } from "@/lib/board";
import { priceStatement, eur, type Listing } from "@/lib/listing";

type Props = { params: Promise<{ slug: string }> };

async function loadListing(slug: string) {
  return getLiveListingBySlug(slug);
}

function fact(label: string, value: React.ReactNode) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Reiseangebot" };
}

export default async function DealPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-8 text-sm">
        <Link href="/deals" className="text-muted-foreground hover:text-foreground">
          ← Alle Angebote
        </Link>
      </nav>
      {/* params is runtime data under cacheComponents — it may only be read
          inside a Suspense boundary, so the whole body streams below it. */}
      <Suspense fallback={<div className="h-96 animate-pulse rounded-card border border-border bg-surface" />}>
        <DealBody params={params} />
      </Suspense>
    </main>
  );
}

async function DealBody({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  await connection(); // live board data — never prerendered (cacheComponents)
  const listing = await loadListing(slug);
  if (!listing) notFound();

  const l = listing;
  const statement = priceStatement(l);
  const checked = l.lastChecked ? new Date(l.lastChecked).toLocaleString("de-DE") : "unbekannt";
  const published = l.sourcePublishedAt ? new Date(l.sourcePublishedAt).toLocaleDateString("de-DE") : "—";
  const sourceName = l.sourceName;
  const sourceUrl = l.sourceAttributionUrl;

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold md:text-3xl">{l.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {l.destination}
        {l.country ? ` (${l.country})` : ""} · gefunden am {published}
        {sourceName ? ` bei ${sourceName}` : ""}
      </p>

      <div className="mt-6 rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="tnum text-3xl font-extrabold text-primary">
          {l.priceFromEur != null ? `ab ${eur(l.priceFromEur)}` : "Preis beim Anbieter prüfen"}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{statement}</p>

        <a
          href={`/api/deal-click/${l.id}`}
          className="mt-5 inline-block rounded-input bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Zum Angebot beim Anbieter
        </a>
        <p className="mt-2 text-[11px] text-subtle">
          Weiterleitung zum Veranstalter. {sourceName ? `Angebot ursprünglich bei ${sourceName} veröffentlicht` : "Quelle: Anbieter"}
          . Für vermittelte Buchungen können wir eine Provision erhalten — das ändert nichts am Preis.
        </p>
      </div>

      <dl className="mt-8">
        {l.nights != null && fact("Reisedauer", `${l.nights} Nächte`)}
        {l.travelWindow?.label && fact("Reisezeitraum", l.travelWindow.label)}
        {l.travelWindow?.start && fact("An-/Abreise", `${l.travelWindow.start} – ${l.travelWindow.end ?? "?"}`)}
        {l.departureAirport && fact("Abflughafen", l.departureAirport)}
        {l.travellers != null && fact("Reisende", `${l.travellers} Personen`)}
        {l.accommodation.name && fact("Unterkunft", l.accommodation.name)}
        {l.accommodation.category != null && fact("Kategorie (Anbieterangabe)", `${l.accommodation.category}★`)}
        {l.accommodation.board && fact("Verpflegung", l.accommodation.board)}
        {l.themes.length > 0 && fact("Themen", l.themes.join(", "))}
        {l.included.length > 0 && fact("Enthalten", l.included.join(", "))}
        {l.excluded.length > 0 && fact("Nicht enthalten", l.excluded.join(", "))}
        {sourceName &&
          fact(
            "Gefunden bei",
            sourceUrl ? (
              <a href={sourceUrl} className="text-primary underline">
                {sourceName}
              </a>
            ) : (
              sourceName
            )
          )}
        {fact("Zuletzt geprüft", checked)}
        {fact("Status", "redaktionell geprüft")}
      </dl>

      {l.notes && (
        <p className="mt-6 rounded-input bg-surface-warm p-4 text-xs text-muted-foreground">{l.notes}</p>
      )}

      <section className="mt-10 border-t border-border pt-6 text-xs text-subtle">
        <p>
          Alle Angaben laut Anbieter zum Prüfzeitpunkt. Preise können sich ändern,
          Verfügbarkeit ist begrenzt. Diese Seite ist keine Buchung — sie verlinkt auf
          das Angebot des Veranstalters.
        </p>
      </section>

      <JsonLd l={l} statement={statement} />
    </>
  );
}

// Schema.org facts about the offer as we know them. Only fields we actually
// verified are emitted; price is the "from" price with the required statement.
function JsonLd({ l, statement }: { l: Listing; statement: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title,
    description: l.summary,
    brand: { "@type": "Brand", name: l.sourceName || l.destination || "Unbekannt" },
    offers:
      l.priceFromEur != null
        ? {
            "@type": "Offer",
            price: l.priceFromEur,
            priceCurrency: "EUR",
            priceSpecification: {
              "@type": "PriceSpecification",
              price: l.priceFromEur,
              priceCurrency: "EUR",
              valueAddedTaxIncluded: true,
            },
            availability: "https://schema.org/InStock",
            url: `https://travelboard.johnxlabs.de/deal/${l.slug}`,
            validThrough: l.travelWindow?.end ?? undefined,
          }
        : undefined,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Reisedauer", value: l.nights != null ? `${l.nights} Nächte` : undefined },
      { "@type": "PropertyValue", name: "Abflughafen", value: l.departureAirport ?? undefined },
      { "@type": "PropertyValue", name: "Unterkunft", value: l.accommodation.name ?? undefined },
      { "@type": "PropertyValue", name: "Kategorie", value: l.accommodation.category != null ? `${l.accommodation.category} Sterne` : undefined },
      { "@type": "PropertyValue", name: "Verpflegung", value: l.accommodation.board ?? undefined },
      { "@type": "PropertyValue", name: "Zuletzt geprüft", value: l.lastChecked ?? undefined },
      { "@type": "PropertyValue", name: "Preishinweis", value: statement },
    ].filter((p) => p.value != null),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
