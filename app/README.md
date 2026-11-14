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
| `/blog` | Guides — articles, each tied to a hub's live offers |
| `/blog/<slug>` | A guide + the live offers it is about |
| `/blog/feed.xml` | RSS 2.0 feed of the guides |
| `/anfrage` | The older decision-product forms ("beat this holiday" / "find me a holiday") |
| `/admin` | Read-only curation queue of feed candidates |

## Commands

Run these from `app/`, or from the repo root with `npm --prefix app run <script>`.

```bash
npm run dev      # dev server
npm run build    # production build
npm run lint     # eslint
npx tsc --noEmit # typecheck
npm test         # vitest
npm run ingest   # poll the feeds into data/candidates.json
npm run publish  # publish a reviewed candidate to the board (see below)
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
3. Publish it:

   ```bash
   npm run publish -- <candidate-id> --price 742 --program booking
   ```

   `--price` is **required** — the command refuses to publish a number nobody
   verified. It also refuses an offer whose travel window has already ended, and
   one with no destination. It moves the row into `app/data/listings.json` with
   `status: "live"` and `confidence: "verified"`, then you commit both files.
   Use `--dry-run` to see the row first.

Only `live` rows are ever shown, and `lib/store.ts` re-checks `last_checked`
against the source's `max_age_days` at read time, so a stale offer cannot linger
even if nobody runs ingest.

### Affiliate links

The board stores the **raw** supplier URL and wraps it at click time, so the
stored data stays honest and the marker can change without a data edit. The
wrapper is a pure function ([`lib/affiliate.ts`](lib/affiliate.ts)) — no network
call, no dashboard round-trip.

Set these in `app/.env.local` to turn it on:

```
TRAVELPAYOUTS_MARKER=...   # your Partner ID
TRAVELPAYOUTS_TRS=...      # your Project ID
TRAVELPAYOUTS_PROGRAMS=... # optional, "booking:2076,kiwi:3791"
```

**With no environment variables the board still works** — the builder is a
passthrough and clicks go straight to the supplier. Nothing breaks; you just
earn nothing.

The listing id doubles as the affiliate SubID, so the Travelpayouts report can
answer *which offer earns*. Each click logs a `deal_click` line with `network`,
`program` and an `affiliate` boolean, so a click that earns nothing is
distinguishable from one that does.

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

#### Funnel events drop silently when the schema is missing

`POST /api/track` writes `page_view` / `form_submit` / `deal_click` rows to the
`travel_events` collection. If `PB_URL` points at an instance where
`travel_events` has not been imported, PocketBase answers **404**, and the route
answers `204` and drops the event — analytics is never allowed to show the user
an error, and a beacon that fails would only paint a red line in their console.

The first drop per process logs one warning:

```
[track] travel_events is missing on this PocketBase instance — import
pocketbase/collections.json. Funnel events are being dropped.
```

So: **a clean console does not mean tracking works.** Check that one line in the
server output, and check `travel_events` actually exists:

```bash
curl -s "$PB_URL/api/collections/travel_events/records?perPage=1"
```

`403` means the collection exists but its rules are locked; `404` means it was
never imported. Import [`../pocketbase/collections.json`](../pocketbase/collections.json)
before expecting any funnel numbers.

Real transport failures still return `502`, because those are worth noticing.

## Writing a guide

Articles live in `content/blog/` and are registered in `lib/blog.ts`. There is no
CMS and no build script: the `.mdx` file is imported at build time, so an article
is a commit like any other source file.

**Three steps to publish:**

1. Write `content/blog/<slug>.mdx` — plain markdown, no frontmatter.
2. Import it in [`lib/blog-bodies.ts`](lib/blog-bodies.ts) and add the row to
   `POSTS` in [`lib/blog.ts`](lib/blog.ts).
3. `npm run build`.

Both files fail loudly if they disagree: `Record<PostSlug, MDXContent>` makes a
missing body a type error, and `lib/blog.ts` validates slugs, dates and hub names
at import.

| Field | Meaning |
| --- | --- |
| `slug` | URL segment. Lowercase, hyphenated. Also the registry key. |
| `title` | The `<h1>`, the feed title, the OG title. |
| `summary` | One honest sentence. Index, feed and meta description. |
| `publishedAt` | `YYYY-MM-DD`. |
| `updatedAt` | Optional, only when the substance changed. |
| `hub` | A hub slug from [`lib/hubs.ts`](lib/hubs.ts). **Required.** |
| `deals` | Optional listing slugs. Empty means "use every live offer in the hub". |

### The rules

- **Every article names the hub it is about.** The page renders that hub's live
  verified offers beneath the prose. That is what makes it a decision page rather
  than an SEO article, and it is enforced by the type, not by discipline.
- **Never write a price into the prose.** Prices come from the board, where they
  are dated and expire. A hardcoded number is stale the moment it ships.
- **A guide with fewer than three live offers says so** instead of showing a
  thin selection. Do not work around that block.
- The north star is a *decision someone is trying to make* ("is this offer good?",
  "which of these two?"), not a keyword.

Deferred on purpose until there are enough posts to need them: category/tag
archives, related-article lists, prev/next, reading time, search, a CMS, and
`IndexNow` pings on publish.

> **Language:** the market is German, the site is English. English guides will not
> rank for German queries. This is a known open decision, not an oversight — see
> the root README.

## Architecture

```
Layer 1  Data          public travel feeds (RSS)
Layer 2  Normalized trip model   lib/listing.ts — the core asset
Layer 3  Decision engine         human curation + lib/hubs.ts filters
Layer 4  Public pages            /, /deals, /deal/<slug>, /holidays/<hub>, /blog
Layer 5  Machine-readable        /api/holidays, /sitemap.xml
Layer 6  Affiliate transaction   /api/deal-click/[id] -> affiliate-wrapped booking_url
```

`lib/store.ts` is the only module that touches storage. Everything downstream
reads through it, so swapping the JSON files for a database later is a change in
one file.

The blog is deliberately split into three files so the test suite never has to
compile MDX: `lib/blog.ts` (registry + RSS, plain TypeScript, unit tested),
`lib/blog-bodies.ts` (the `.mdx` imports), `mdx-components.tsx` (prose styling).
The `.mdx` files themselves are compiled at build time by `@next/mdx`, which is
wired up in `next.config.ts`. No `pageExtensions` change: `.mdx` is not a route,
only a registry entry is.

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

