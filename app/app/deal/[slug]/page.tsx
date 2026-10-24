import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getLiveListingBySlug } from "@/lib/store";
import { priceStatement, eur, type Listing } from "@/lib/listing";
import { SITE_URL } from "@/lib/site";

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
  return { title: "Holiday offer" };
}

export default async function DealPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-6 text-sm">
        <Link href="/deals" className="text-muted-foreground hover:text-foreground">
          ← All offers
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
  const checked = l.lastChecked ? new Date(l.lastChecked).toLocaleString("en-GB") : "unknown";
  const published = l.sourcePublishedAt ? new Date(l.sourcePublishedAt).toLocaleDateString("en-GB") : "—";
  const sourceName = l.sourceName;
  const sourceUrl = l.sourceAttributionUrl;

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold md:text-3xl">{l.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {l.destination}
        {l.country ? ` (${l.country})` : ""} · found on {published}
        {sourceName ? ` at ${sourceName}` : ""}
      </p>

      <div className="mt-6 rounded-card border border-border bg-surface p-6 shadow-card">
        <p className="tnum text-3xl font-extrabold text-primary">
          {l.priceFromEur != null ? `from ${eur(l.priceFromEur)}` : "Check the price with the supplier"}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{statement}</p>

        <a
          href={`/api/deal-click/${l.id}`}
          className="mt-5 inline-block rounded-input bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Go to the offer at the supplier
        </a>
        <p className="mt-2 text-[11px] text-subtle">
          You are redirected to the tour operator. {sourceName ? `Offer originally published at ${sourceName}` : "Source: supplier"}
          . We may receive a commission on referred bookings — this does not change the price.
        </p>
      </div>

      <dl className="mt-8">
        {l.nights != null && fact("Trip length", `${l.nights} nights`)}
        {l.travelWindow?.label && fact("Travel window", l.travelWindow.label)}
        {l.travelWindow?.start && fact("Departure / return", `${l.travelWindow.start} – ${l.travelWindow.end ?? "?"}`)}
        {l.departureAirport && fact("Departure airport", l.departureAirport)}
        {l.travellers != null && fact("Travellers", `${l.travellers} people`)}
        {l.accommodation.name && fact("Accommodation", l.accommodation.name)}
        {l.accommodation.category != null && fact("Category (supplier's rating)", `${l.accommodation.category}★`)}
        {l.accommodation.board && fact("Board", l.accommodation.board)}
        {l.themes.length > 0 && fact("Themes", l.themes.join(", "))}
        {l.included.length > 0 && fact("Included", l.included.join(", "))}
        {l.excluded.length > 0 && fact("Not included", l.excluded.join(", "))}
        {sourceName &&
          fact(
            "Found at",
            sourceUrl ? (
              <a href={sourceUrl} className="text-primary underline">
                {sourceName}
              </a>
            ) : (
              sourceName
            )
          )}
        {fact("Last checked", checked)}
        {fact("Status", "editorially verified")}
      </dl>

      {l.notes && (
        <p className="mt-6 rounded-input bg-surface-warm p-4 text-xs text-muted-foreground">{l.notes}</p>
      )}

      <section className="mt-10 border-t border-border pt-6 text-xs text-subtle">
        <p>
          All details as stated by the supplier at the time we checked. Prices can
          change and availability is limited. This page is not a booking — it links
          to the tour operator&apos;s offer.
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
    brand: { "@type": "Brand", name: l.sourceName || l.destination || "Unknown" },
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
            url: `${SITE_URL}/deal/${l.slug}`,
            validThrough: l.travelWindow?.end ?? undefined,
          }
        : undefined,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Trip length", value: l.nights != null ? `${l.nights} nights` : undefined },
      { "@type": "PropertyValue", name: "Departure airport", value: l.departureAirport ?? undefined },
      { "@type": "PropertyValue", name: "Accommodation", value: l.accommodation.name ?? undefined },
      { "@type": "PropertyValue", name: "Category", value: l.accommodation.category != null ? `${l.accommodation.category} stars` : undefined },
      { "@type": "PropertyValue", name: "Board", value: l.accommodation.board ?? undefined },
      { "@type": "PropertyValue", name: "Last checked", value: l.lastChecked ?? undefined },
      { "@type": "PropertyValue", name: "Price note", value: statement },
    ].filter((p) => p.value != null),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
