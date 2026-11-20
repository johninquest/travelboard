import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { COUNTRY_NAMES } from "@/lib/criteria";
import {
  allSeasons,
  bandIn,
  isInSeason,
  monthName,
  unsourcedCountries,
  type SeasonBand,
} from "@/lib/season";
import { KIND_LABEL, platformsByKind, type Platform } from "@/lib/platforms";
import { getLiveListings } from "@/lib/store";
import { formatDate } from "@/lib/blog";

// "Where to look this month" — a source guide, not an offer page.
//
// It exists because the board's bottleneck is verified offers, and this page needs
// none. It answers a different question: which of our destinations are actually in
// season right now, and which *kind* of source carries that inventory.
//
// The hard rule this page is built around: it makes no availability claim and shows
// no price. "TUI sells its own package inventory" is a business-model fact.
// "TUI has Crete in November" would be an unverified claim about stock, and the
// project forbids publishing one. The page says so in prose rather than relying on
// the reader to infer it.
//
// The platform list is rendered ONCE, not per destination. The platforms are not
// destination-specific — repeating seven identical blocks under four destinations
// would be duplicate content and would make the click data unreadable.

export const metadata: Metadata = {
  title: "Where to look for a package holiday this month",
  description:
    "Which of our destinations are in season right now, and which kind of booking site carries that inventory. No prices, no availability claims — business models only.",
};

const BAND_LABEL: Record<SeasonBand, string> = {
  peak: "Peak season",
  shoulder: "Shoulder season",
  quiet: "Quiet season",
  closed: "Closed",
};

const BAND_STYLE: Record<SeasonBand, string> = {
  peak: "bg-primary-soft text-primary",
  shoulder: "bg-secondary-soft text-secondary",
  quiet: "bg-surface-warm text-muted-foreground",
  closed: "bg-surface-warm text-subtle",
};

export default function WhereToLookPage() {
  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-8">
      <Suspense fallback={<PageSkeleton />}>
        <PageBody />
      </Suspense>
    </main>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-9 w-2/3 animate-pulse rounded-input bg-surface-warm" />
      <div className="h-4 w-1/2 animate-pulse rounded-input bg-surface-warm" />
      <div className="h-64 animate-pulse rounded-card border border-border bg-surface" />
    </div>
  );
}

async function PageBody() {
  // The month is read at request time, not at build time. A page that says
  // "November" in March is worse than no page, and this one is cheap to render.
  await connection();
  const now = new Date();
  const monthIndex = now.getMonth();
  const month = monthName(monthIndex);
  const year = now.getFullYear();

  const rows = allSeasons();
  const inSeason = rows.filter((r) => isInSeason(r.country, monthIndex));
  const outOfSeason = rows.filter((r) => !isInSeason(r.country, monthIndex));
  const unsourced = unsourcedCountries();
  // Platforms are not destination-specific today, so the list is built once.
  const groups = platformsByKind("ES");
  // Read the real count rather than asserting "the board is empty". That sentence
  // would become a lie the first time an offer is published, and a page whose whole
  // premise is not overstating things cannot afford one.
  const liveOffers = await getLiveListings().catch(() => []);

  return (
    <>
      <h1 className="font-display text-2xl font-extrabold md:text-3xl">
        Where to look for a package holiday in {month} {year}
      </h1>

      <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
        Two questions, answered separately: which of our destinations are in season
        this month, and which kind of booking site actually carries that inventory.
      </p>

      {/* The disclaimer is above the content, not in a footer. A reader must know
          what this page is before they read a single recommendation. */}
      <section className="mt-6 rounded-card border border-border bg-surface-warm p-5">
        <h2 className="text-sm font-semibold">What this page does and does not tell you</h2>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">It does:</strong> say when each
            destination is in season, and what kind of inventory each booking site
            sells.
          </li>
          <li>
            <strong className="text-foreground">It does not:</strong> show a price, or
            claim that any site has a specific offer available. We have not checked
            availability, so we do not state it.
          </li>
          <li>
            Verified prices live on{" "}
            <Link href="/deals" className="text-primary underline">
              the board
            </Link>
            {liveOffers.length === 0
              ? ", which is currently empty while offers are being checked."
              : `, which currently carries ${liveOffers.length} checked ${
                  liveOffers.length === 1 ? "offer" : "offers"
                }.`}
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold">In season in {month}</h2>
        {inSeason.length === 0 ? (
          <p className="mt-3 max-w-[70ch] text-sm text-muted-foreground">
            None of the destinations we have a sourced season for is in season this
            month. That is a real answer, not a missing one — {month} is outside the
            season for all of them. They are still bookable; see{" "}
            <em>Out of season</em> below.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {inSeason.map((row) => (
              <DestinationRow key={row.country} country={row.country} monthIndex={monthIndex} />
            ))}
          </div>
        )}
      </section>

      {outOfSeason.length > 0 && (
        <section className="mt-10 border-t border-border pt-6">
          <h2 className="font-display text-lg font-bold">Out of season in {month}</h2>
          <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
            Still bookable, but this is the off-season for these destinations. Expect
            reduced opening hours and a thinner flight schedule rather than a cheaper
            price — we have not checked either.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {outOfSeason.map((row) => (
              <DestinationRow key={row.country} country={row.country} monthIndex={monthIndex} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="font-display text-lg font-bold">Where to look</h2>
        <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
          {inSeason.length > 0
            ? "Start with the tour operators and comparison sites — they sell a complete package in one booking. The last two groups are for building a trip yourself."
            : "Nothing is in season this month, so the package sources below are the ones to check for off-season availability. The last two groups are for building a trip yourself."}
        </p>

        <div className="mt-5 flex flex-col gap-6">
          {groups.map((group) => (
            <div key={group.kind}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle">
                {KIND_LABEL[group.kind]}
              </h3>
              <ul className="mt-2 flex flex-col gap-3">
                {group.platforms.map((p) => (
                  <PlatformRow key={p.slug} platform={p} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {unsourced.length > 0 && (
        <section className="mt-10 border-t border-border pt-6">
          <h2 className="font-display text-lg font-bold">We cannot answer for these yet</h2>
          <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
            These destinations are on the board, but we have no named source for their
            season, so we say nothing rather than guess. They are listed here so the
            gap is visible instead of silent.
          </p>
          <p className="mt-3 text-sm">
            {unsourced
              .map((c) => COUNTRY_NAMES[c as keyof typeof COUNTRY_NAMES])
              .join(", ")}
          </p>
        </section>
      )}

      <section className="mt-10 border-t border-border pt-6 text-xs text-subtle">
        <p>
          Season bands come from the sources named under each destination. Platform
          descriptions are statements about what each company sells, read from its own
          site on the date shown. Neither is a price, a rating, or an availability
          claim. We are not paid for the links on this page.
        </p>
      </section>
    </>
  );
}

function DestinationRow({ country, monthIndex }: { country: string; monthIndex: number }) {
  const row = allSeasons().find((r) => r.country === country);
  if (!row) return null;
  const band = bandIn(country, monthIndex);

  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-display text-base font-bold">{row.name}</h3>
        {band && (
          <span className={`rounded-input px-2 py-0.5 text-xs font-semibold ${BAND_STYLE[band]}`}>
            {BAND_LABEL[band]}
          </span>
        )}
      </div>

      <p className="mt-1.5 max-w-[70ch] text-sm text-muted-foreground">{row.note}</p>

      {/* A `market` row is a weaker claim than a `corridor` row: the source states
          the origin market's calendar, not this specific pair. Saying which is
          which is the difference between a sourced claim and an implied one. */}
      <p className="mt-1.5 text-xs text-subtle">
        {row.basis === "corridor"
          ? "Season stated for this specific corridor."
          : "Season inferred from the German outbound demand calendar — the source gives no separate season for this destination."}{" "}
        Source:{" "}
        <a
          href={row.sourceUrl}
          className="underline hover:text-foreground"
          rel="noopener noreferrer"
          target="_blank"
        >
          {row.source}
        </a>
      </p>
    </article>
  );
}

function PlatformRow({ platform }: { platform: Platform }) {
  return (
    <li className="border-b border-border pb-3 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <a
          href={platform.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline hover:text-primary-hover"
        >
          {platform.name}
        </a>
        <span className="text-[11px] text-subtle">
          checked {formatDate(platform.lastVerified)}
        </span>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{platform.sells}</p>
      <p className="mt-0.5 text-xs text-subtle">Limitation: {platform.limitation}</p>
    </li>
  );
}
