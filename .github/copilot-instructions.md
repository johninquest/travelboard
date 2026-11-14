# Copilot Instructions — travelboard

## What this is

A board of **verified package-holiday offers** for a deliberately narrow market, monetised by
affiliate links. The board renders facts server-side; booking happens at the supplier.

The board is the front door (`/`), with `/deals` as the canonical board URL and `/anfrage`
holding the older decision-product forms.

Read [`ideation_session.txt`](/ideation_session.txt) before changing product direction, and
[`docs/strategy.md`](/docs/strategy.md) before adding features. The current phase is a
**12-week content test**: the board is the instrument, the writing is the test. Do not
over-build it.

## Locked market (do not generalize)

- **Departures:** Munich, Nuremberg, Stuttgart, Frankfurt
- **Destinations:** Spain, Greece, Turkey, Portugal, Italy, Cyprus, Malta
- **Trip length:** 4–10 nights · **Budget:** €400–€2,000 · prices in EUR, per person *and* total
- **Travellers:** typically 2 adults

Audience niches (mobility, dogs, solo 50+) are **lenses on this inventory, never second
sites**. Niche claims live in article prose only — do not add `themes` values or PocketBase
schema fields to label an offer pet- or accessibility-friendly; the board cannot verify that.

## Hard rules

- **A feed item is discovery, not a fact.** Nothing is `live` until a human verified the
  price on the source page. Never present an estimate as a confirmed price.
- **Never fabricate** prices, availability, ratings, or accessibility claims. Missing or
  stale data must be stated as missing, on the page.
- **No scraping.** Only sources listed in [`docs/data-sources.md`](/docs/data-sources.md).
  Never impersonate named AI bots when polling feeds.
- **No supplier prose or photos.** Listing summaries are our own wording.
- **Every affiliate click is attributed** as `niche_article_listing` (see
  [`app/lib/affiliate.ts`](/app/lib/affiliate.ts) and [`app/lib/surface.ts`](/app/lib/surface.ts)).
  Unrecognised `?from=` values must degrade to `direct` and never reach the marker.
- **Every page with affiliate links carries the disclosure** next to the CTA, not in a
  footer (UWG §5a Abs. 4, Anhang Nr. 11).
- **No price in prose.** Prices come from the board, where they are dated and expire.
- **Only create an indexable page that has enough real data to justify existing** (≥3 live
  offers). Thin pages answer nothing.
- Prefer **3–5 recommendations** over long lists. The value is narrowing, not enumerating.
- **≤30% of effort on dashboard code.** If a request adds machinery before a niche is kept,
  say so before building it.
- **Never start a local PocketBase instance** — the user manages PocketBase themselves.
- AI features, agent frameworks, RAG, vector DBs, own booking engine, payments: out of scope
  unless `docs/strategy.md` or the ideation doc changes first.

## Commands (from `app/`, or `npm --prefix app run <script>` from root)

| Purpose | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Typecheck | `npx tsc --noEmit` |
| Tests | `npm test` (vitest — this is the enforcement gate; there is no CI) |
| Feed ingest | `npm run ingest` |
| Publish an offer | `npm run publish` |

## Deployment

`app/` is a monorepo member, not the repo root: deploy via a **base directory** (`netlify.toml`
sets `base = "app"`; Vercel uses Root Directory; the `Dockerfile` copies `app/`). Do not "fix"
the `cd app/` ergonomics by adding a root `package.json` — a second Node project makes host
auto-detection pick the wrong root. Keep `engines.node` / `app/.nvmrc` / `NODE_VERSION` in step.

## Setup prerequisites

The board renders an empty state until these are done — full list in
[`app/README.md`](/app/README.md):

1. Import the extended PocketBase schema (`travel_sources`, `travel_listings`,
   `travel_clicks.listing`).
2. Seed `travel_sources` rows.
3. Set `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` in `app/.env.local`.
4. Run `npm run ingest`.

PocketBase is **not** on the critical path: the board reads committed JSON through
`app/lib/store.ts`. With no env vars at all the board renders and links out correctly — it
just earns nothing.

## Where the reasoning lives

Not loaded every request — read the one that applies:

| File | Contains |
| --- | --- |
| [`docs/strategy.md`](/docs/strategy.md) | The 12-week test, the 8 h/week split and 30% cap, timeline, **keep/kill/double-down rules**, what is deferred and its trigger |
| [`docs/niche-audits.md`](/docs/niche-audits.md) | The four audit gates and per-niche findings. **This decides which niches are in the test** |
| [`docs/data-sources.md`](/docs/data-sources.md) | Approved sources, licences, attribution requirements, what must not be used |
| [`docs/decision-log.md`](/docs/decision-log.md) | Decisions with reasons, newest first. Read at session start; write the value-challenger log here at session end |
| [`docs/product-principles.md`](/docs/product-principles.md) | The older thesis, layered architecture, answerability conventions, V0–V5 roadmap |
| [`README.md`](/README.md) | Public-facing statement of what the board is and is not |

## Conventions

- The market is German and the site is English. Language is an open product decision — do not
  "fix" it in code without the ideation doc changing first.
- Prices: EUR, total *and* per person, always with `last_checked` so staleness is visible.
- `/blog` posts are decision-bound guides: each declares a hub and renders that hub's live
  offers. No tag archives, related posts, pagination, search or a CMS until needed.
- Keep this file under ~100 lines. If it grows, move detail to `docs/` and point here.
