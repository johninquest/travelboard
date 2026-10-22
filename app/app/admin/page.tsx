import { connection } from "next/server";
import { pbAuthed } from "@/lib/pb";
import { recordToListing } from "@/lib/listings-read";
import { eur, priceStatement } from "@/lib/listing";
import type { Listing } from "@/lib/listing";

// Blocking route: reads the queue live on every load.
export const instant = false;

// Curation queue for the deals board. Deliberately thin — full editing happens
// in Pocketbase's dashboard. This page exists so the one recurring decision
// (approve / reject a feed candidate) takes one click, not a dashboard visit.
// No client-side auth: must only be reachable behind the VPS (or add an
// ADMIN_TOKEN gate before exposing).

type QueueItem = {
  id: string;
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
  let queue: QueueItem[] = [];
  let requests: Record<string, unknown>[] = [];
  let funnel = { views: -1, board: -1, deals: -1, clicks: -1, requests: -1 };
  let error = "";
  try {
    const pb = await pbAuthed();
    const listings = await pb
      .collection("travel_listings")
      .getFullList({ filter: "status = 'needs_review'", sort: "-source_published_at", expand: "source", requestKey: null });
    queue = listings.map((rec) => {
      const l = recordToListing(rec as unknown as Record<string, unknown>);
      return { id: l.id, listing: l, ageDays: ageDays(l.sourcePublishedAt) };
    });
    const res = await pb
      .collection("travel_requests")
      .getList(1, 50, { filter: "status='open'", sort: "-id" });
    requests = res.items;

    // 7-day funnel readout: counts only, via Pocketbase total (no aggregation needed).
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 19) + "Z";
    const count = async (collection: string, filter: string): Promise<number> => {
      try {
        const r = await pb.collection(collection).getList(1, 1, { filter, requestKey: null });
        return r.totalItems;
      } catch {
        return -1;
      }
    };
    funnel = {
      views: await count("travel_events", `name = "page_view" && created >= "${since}"`),
      board: await count("travel_events", `name = "page_view" && props.path = "/deals" && created >= "${since}"`),
      deals: await count("travel_events", `name = "page_view" && props.path ~ "/deal/" && created >= "${since}"`),
      clicks: await count("travel_clicks", `created >= "${since}"`),
      requests: await count("travel_requests", `created >= "${since}"`),
    };
  } catch (e) {
    error = e instanceof Error ? e.message : "Pocketbase unreachable";
  }

  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-12 flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Kuration</h1>
      {error && <p className="text-sm text-danger">{error}</p>}

      <section aria-label="Funnel der letzten 7 Tage">
        <h2 className="text-sm font-semibold text-muted-foreground">Funnel (7 Tage)</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { k: "Seitenaufrufe", v: funnel.views },
            { k: "Board /deals", v: funnel.board },
            { k: "Deal-Seiten", v: funnel.deals },
            { k: "Klicks raus", v: funnel.clicks },
            { k: "Anfragen", v: funnel.requests },
          ].map(({ k, v }) => (
            <div key={k} className="rounded-(--radius-card) border border-border bg-surface p-4">
              <p className="text-xs uppercase tracking-wide text-subtle">{k}</p>
              <p className="tnum mt-1 text-2xl font-bold">{v < 0 ? "—" : v}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-subtle">
          Klicks ÷ Seitenaufrufe = CTR. Revenue pro Visitor erst mit CHECK24-Partnerreport.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground">
          Feed-Kandidaten ({queue.length})
        </h2>
        {queue.length === 0 && !error && (
          <p className="mt-2 text-sm text-muted-foreground">Keine Kandidaten in der Warteschlange.</p>
        )}
        <div className="mt-3 flex flex-col gap-4">
          {queue.map(({ id, listing: l, ageDays: age }) => (
            <article key={id} className="rounded-(--radius-card) border border-border bg-surface p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">{l.title}</h3>
                <span className="text-xs text-subtle">
                  {age > 0 ? `${age} Tage alt` : "heute"} · {l.sourceName || "Quelle?"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {l.destination}
                {l.country ? ` (${l.country})` : ""} · {l.departureAirport || "—"} ·{" "}
                {l.nights != null ? `${l.nights} Nächte` : "Dauer?"} ·{" "}
                {l.travelWindow?.label || "Reisezeitraum?"}
              </p>
              <p className="tnum mt-1 text-sm font-semibold text-primary">
                {l.priceFromEur != null ? `ab ${eur(l.priceFromEur)}` : "kein Preis erkannt"}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{priceStatement(l)}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                <a href={l.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Quellseite prüfen
                </a>
              </div>
              <form action="/api/admin" method="post" className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="action" value="listing_decision" />
                <input type="hidden" name="listing" value={id} />
                <button
                  type="submit"
                  name="decision"
                  value="live"
                  className="rounded-input bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                >
                  Live schalten
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="expired"
                  className="rounded-input border border-border px-3 py-1.5 text-xs hover:bg-surface-warm"
                >
                  Verwerfen
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground">
          Offene Anfragen ({requests.length})
        </h2>
        {requests.length === 0 && !error && (
          <p className="mt-2 text-sm text-muted-foreground">No open requests.</p>
        )}
        {requests.map((r) => (
          <article
            key={String(r["id"])}
            className="mt-3 rounded-(--radius-card) border border-border bg-surface p-4"
          >
            <p className="text-sm font-medium">
              {String(r["source"])} ·{" "}
              <a href={`/r/${String(r["token"])}`} className="text-primary underline">
                /r/{String(r["token"])}
              </a>
            </p>
            <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(r["criteria"], null, 2)}</pre>
          </article>
        ))}
      </section>
    </main>
  );
}
