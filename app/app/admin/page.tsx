import { connection } from "next/server";
import { getCandidates } from "@/lib/store";
import { eur, priceStatement } from "@/lib/listing";
import type { Listing } from "@/lib/listing";

// Blocking route: reads the queue live on every load.
export const instant = false;

// Curation queue for the deals board. Read-only on purpose: publishing is a
// commit to data/listings.json, not a button. That keeps the board's contents
// reviewable in git and means this page needs no credentials and no write path
// — so there is nothing here to protect beyond the queue itself.
//
// Still not for crawlers (see app/robots.ts).

type QueueItem = {
  listing: Listing;
  ageDays: number;
};

function ageDays(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 86_400_000);
}

export default async function AdminPage() {
  await connection();
  const candidates = await getCandidates().catch(() => []);
  const queue: QueueItem[] = candidates.map((l) => ({
    listing: l,
    ageDays: ageDays(l.sourcePublishedAt),
  }));

  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-12 flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Curation</h1>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground">
          Feed candidates ({queue.length})
        </h2>
        {queue.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            No candidates in the queue. Run <code>npm run ingest</code> to poll the feeds.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-4">
          {queue.map(({ listing: l, ageDays: age }) => (
            <article key={l.id} className="rounded-(--radius-card) border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">{l.title}</h3>
                <span className="text-xs text-subtle">
                  {age > 0 ? `${age} days old` : "today"} · {l.sourceName || "Source?"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {l.destination}
                {l.country ? ` (${l.country})` : ""} · {l.departureAirport || "—"} ·{" "}
                {l.nights != null ? `${l.nights} nights` : "Duration?"} ·{" "}
                {l.travelWindow?.label || "Travel window?"}
              </p>
              <p className="tnum mt-1 text-sm font-semibold text-primary">
                {l.priceFromEur != null ? `from ${eur(l.priceFromEur)}` : "no price detected"}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{priceStatement(l)}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Check the source page
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border pt-6 text-xs text-subtle">
        <p>
          To publish an offer, check the price on the source page and move its entry
          from <code>data/candidates.json</code> into <code>data/listings.json</code> with{" "}
          <code>status: &quot;live&quot;</code> and <code>confidence: &quot;verified&quot;</code>.
          A feed item is discovery, never a fact.
        </p>
      </section>
    </main>
  );
}
