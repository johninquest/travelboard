# sunwise. — travel deals board

A feed-first board of verified package-holiday offers for German departure airports.
The board is the front door: `/` and `/deals` render the same server-rendered listings.

## Routes

| Route | What it is |
| --- | --- |
| `/` | The board (front door) |
| `/deals` | Canonical board URL — same board, in the sitemap |
| `/deal/<slug>` | Offer fact sheet + affiliate CTA |
| `/holidays/<hub>` | Destination/airport/theme/month hubs, gated at ≥3 live offers |
| `/anfrage` | The older decision-product forms ("beat this holiday" / "find me a holiday") |
| `/admin` | Read-only curation queue of feed candidates |

## Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
npx tsc --noEmit # typecheck
npm test         # vitest
npm run ingest   # poll the feeds into data/candidates.json
```

## Setup prerequisites

**None.** The board reads committed JSON, so a fresh clone renders the board with
no database, no credentials and no environment variables. `app/data/listings.json`
is empty in the repo, so the board shows its empty state until an offer is
published — which is the honest state, not a broken one.

### Publishing an offer

A feed item is *discovery*, never a fact. The workflow is deliberately manual:

1. `npm run ingest` polls the sources in `app/data/sources.json` and writes
   drafts to `app/data/candidates.json` as `needs_review`.
2. Review them at `/admin` (read-only) and check the price on the source page.
3. Move the entry into `app/data/listings.json` with `status: "live"`,
   `confidence: "verified"` and a fresh `last_checked`, then commit.

Only `live` rows are ever shown, and `lib/store.ts` re-checks `last_checked`
against the source's `max_age_days` at read time, so a stale offer cannot linger
even if nobody runs ingest.

### Optional: PocketBase

PocketBase is **not** on the critical path. It is only used by the legacy
`/anfrage` request funnel, and only if `PB_URL` is set in `app/.env.local`:

```
PB_URL=...
PB_SUPERUSER_EMAIL=...
PB_SUPERUSER_PASSWORD=...
NEXT_PUBLIC_SITE_URL=...
```

With no `PB_URL`, `/anfrage` submissions land on `/r/pending` instead of being
persisted. See [`../pocketbase/schema.md`](../pocketbase/schema.md) for the
schema, which is currently deferred.

> Do not start a local PocketBase instance as part of development — the
> PocketBase deployment is managed separately.

## Architecture

```
Layer 1  Data          public travel feeds (RSS)
Layer 2  Normalized trip model   lib/listing.ts — the core asset
Layer 3  Decision engine         human curation + lib/hubs.ts filters
Layer 4  Public pages            /, /deals, /deal/<slug>, /holidays/<hub>
Layer 5  Machine-readable        /api/holidays, /sitemap.xml
Layer 6  Affiliate transaction   /api/deal-click/[id] -> booking_url
```

`lib/store.ts` is the only module that touches storage. Everything downstream
reads through it, so swapping the JSON files for a database later is a change in
one file.

`booking_url` is never shipped to the client — `lib/listings-read.ts` blanks it
in the normalized model, and only `getClickTarget()` can read it. Every outbound
click is logged server-side.

## Conventions

- Prices are EUR. Always show the total and the per-person figure, and state
  `last_checked` so staleness is visible.
- Never fabricate prices, availability, or ratings. If data is missing or stale,
  say so.
- Server-render the facts. Core information must be in the initial HTML, never
  behind a click → spinner → API call.
- Keep supplier integrations behind an abstraction so sources can be swapped
  without touching the ranking layer.

