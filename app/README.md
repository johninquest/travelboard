# travelboard — travel deals board

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
| `/admin` | Curation queue + 7-day funnel metrics |

## Commands

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
npx tsc --noEmit # typecheck
npm test         # vitest
npm run ingest   # import feed candidates into PocketBase
```

## Setup prerequisites

**The board renders an empty state until all of these are done.** They are not
optional — the board reads only `live` listings, and nothing is `live` until a
human has verified it.

1. **Import the extended PocketBase schema.** The board needs `travel_sources`,
   `travel_listings`, and the `listing` relation on `travel_clicks`. See
   [`../pocketbase/schema.md`](../pocketbase/schema.md) and
   [`../pocketbase/collections.json`](../pocketbase/collections.json).
2. **Seed `travel_sources`.** One row per feed you want to ingest, with its
   `feed_url`, `max_age_days`, and attribution fields.
3. **Set the superuser credentials** in `app/.env.local`:
   ```
   PB_URL=...
   PB_SUPERUSER_EMAIL=...
   PB_SUPERUSER_PASSWORD=...
   NEXT_PUBLIC_SITE_URL=...
   ```
   The public board reads use an anon client; the ingest worker and the curation
   admin need the superuser.
4. **Run `npm run ingest`.** Feed imports land as `needs_review` — a feed item is
   *discovery*, not a fact. Approve them in `/admin` to make them `live`.

> Do not start a local PocketBase instance as part of development — the
> PocketBase deployment is managed separately.

## Architecture

```
Layer 1  Data          public travel feeds (RSS)
Layer 2  Normalized trip model   lib/listing.ts — the core asset
Layer 3  Decision engine         curation in /admin + lib/board.ts filters
Layer 4  Public pages            /, /deals, /deal/<slug>, /holidays/<hub>
Layer 5  Machine-readable        /api/holidays, /sitemap.xml
Layer 6  Affiliate transaction   /api/deal-click/[id] -> booking_url
```

`booking_url` is never shipped to the client — the PocketBase view rule hides it
from anon, and every outbound click is logged server-side.

## Conventions

- Prices are EUR. Always show the total and the per-person figure, and state
  `last_checked` so staleness is visible.
- Never fabricate prices, availability, or ratings. If data is missing or stale,
  say so.
- Server-render the facts. Core information must be in the initial HTML, never
  behind a click → spinner → API call.
- Keep supplier integrations behind an abstraction so sources can be swapped
  without touching the ranking layer.

