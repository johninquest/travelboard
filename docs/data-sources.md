# Data sources and their limits

What this project may use, under what licence, and what it may not be used to claim.
This list is a **hard constraint**, not a menu: nothing outside it gets integrated without
a decision logged in [`decision-log.md`](decision-log.md).

## The two rules that come before any source

1. **No scraping.** No crawling supplier sites, no headless browsers, no bypassing
   `robots.txt`, no impersonating named AI bots. Feed polling that respects `robots.txt`
   and the Content-Signal header is the only automated reading this project does.
2. **A feed item is discovery, not a fact.** Nothing becomes `live` until a human has
   verified the price on the source page. Enforced in code by `canBeLive()` in
   [`../app/lib/listing.ts`](../app/lib/listing.ts).

And the claim rule that follows from both: **no invented facts, prices, ratings, or
accessibility claims.** If data is missing or stale, the page says so. This is the project's
only asset.

---

## In use today

### Public deal feeds

Read by `npm run ingest` ([`../app/scripts/ingest.ts`](../app/scripts/ingest.ts)), seeded
from [`../app/data/sources.json`](../app/data/sources.json).

| Source | What it provides | Limits |
| --- | --- | --- |
| Urlaubspiraten (RSS) | Package-holiday deal candidates, German market | `robots.txt` `UA=* Allow: /`; Content-Signal permits search and AI input. `max_age_days: 14` |
| mydealz Reisen (RSS) | Deal candidates | `UA=*` allows `/`. The `Disallow:` lines belong to **named** AI-bot blocks — never impersonate those bots. `max_age_days: 14` |

**Never republish supplier prose or photos.** Titles are used as discovery signals; the
`summary` on a listing is our own wording (max 280 chars). The board's copyright guardrail,
recorded in [`../README.md`](../README.md).

### Travelpayouts — the affiliate layer

Monetisation, not inventory. Configured at click time in
[`../app/lib/affiliate.ts`](../app/lib/affiliate.ts) via `TRAVELPAYOUTS_MARKER`,
`TRAVELPAYOUTS_TRS`, `TRAVELPAYOUTS_PROGRAMS`.

Two things that are easy to get wrong, both handled deliberately in that file:

- On a long link the SubID is a **dot-suffix on the marker**, not a `&sub_id=` query
  parameter. `sub_id=` is documented only for `tp.st` short links.
- **Kiwi.com cannot use `tp.media/r` at all**, and a Kiwi link without a `deep` destination
  is not counted and earns nothing.

Program IDs are taken from Travelpayouts' own documentation, never guessed — a wrong `p`
silently earns nothing. Anything not confirmed has to be read off the live program card and
passed via env.

**Free for development is not free for production.** Read each program's real terms —
payout, cookie window, minimum traffic, country acceptance — during the money-page gate in
[`niche-audits.md`](niche-audits.md).

### Committed JSON, not a database

The board reads two static JSON files
([`../app/data/listings.json`](../app/data/listings.json),
[`../app/data/sources.json`](../app/data/sources.json)) through
[`../app/lib/store.ts`](../app/lib/store.ts). Facts are bundled at build time, so the board
renders in the initial HTML with no database, no credentials, no network. Publishing is a
commit plus a deploy.

PocketBase is **not** on the critical path — only the legacy `/anfrage` funnel, and only if
`PB_URL` is set. **Never start a local PocketBase instance**; it is managed outside this repo.

---

## Approved in principle, not yet integrated

Each of these is a **kept-niche project**. None gets built before a niche clears the keep
bar in [`strategy.md`](strategy.md). They are listed here so the licensing and attribution
work is already understood when the trigger arrives.

### OpenStreetMap — accessibility and pet tags

- **What:** `wheelchair=yes|limited|no` on hotels, restaurants and stations; `dog=yes` on
  some POIs.
- **Licence:** ODbL. **Attribution is a legal requirement, not a courtesy.** Any page using
  it must credit OpenStreetMap contributors.
- **Reality:** patchy and incomplete. `limited` is not `yes`. Breed and size limits are not
  in OSM at all.
- **The constraint that matters:** OSM tags are **evidence to verify, not an answer to
  publish.** A wheelchair tag from 2019 on a hotel that has since renovated is worse than no
  claim. Your own audit or a phone call to the property is what makes it publishable.
- **Trigger:** mobility or dog-friendly niche kept.

### Open-Meteo — weather and cloud cover

- **What:** free, no API key for non-commercial use; forecast and historical weather, cloud
  cover.
- **Licence:** CC-BY 4.0 — attribution required. Check current terms before production use.
- **Use:** the timing score, and the deferred stargazing angle (cloud cover + moon phase +
  light pollution).
- **Trigger:** the monthly data-led report is unblocked.

### Moon phase and light pollution

- **What:** computed moon phase (astronomical, no licence needed) plus a light-pollution
  raster (check the specific dataset's licence — many are non-commercial only).
- **Use:** "best dates and places to see the sky this month."
- **Note:** this is computed content, not opinion, which is why it suits a dashboard. It is
  also the weakest market fit of the five candidates — see
  [`niche-audits.md`](niche-audits.md).

### Google Trends / Wikipedia pageviews

- **What:** interest and crowd signals for the timing score.
- **Limits:** Trends data is sampled and its terms restrict redistribution; Wikipedia
  pageviews are CC-BY but the endpoint has rate limits. Both are **directional inputs**, not
  facts, and must never appear on a page as a precise figure.
- **Trigger:** with the timing score.

---

## Deliberately not used

| Source | Why not |
| --- | --- |
| Amadeus Self-Service | Listed in the older stack notes; nothing currently needs live flight or hotel search. Test quota is not production quota. |
| Booking.com Demand API | Sandbox only until approved as a Managed Affiliate Partner. Never make it a dependency before that approval exists. |
| Duffel | Sandbox prices are not real. Postponed. |
| Viator | Activity affiliate, relevant only if an activity-led niche is kept. Note the ~30-day cookie on its current offering — verify before relying on it. |
| Any scraping of tour operators | Rule 1. |
| AI-generated articles | Out of scope for this test. The right-to-win gate exists to make generic writing impossible. |

---

## Attribution: how a click is traced

Every outbound affiliate click carries a SubID built as:

```
<niche>_<article>_<listing>
```

- `niche` — a token from [`../app/lib/niche.ts`](../app/lib/niche.ts), chosen by the audit
- `article` — the post's `trackCode` from [`../app/lib/blog.ts`](../app/lib/blog.ts)
- `listing` — the listing id, as before

The article and surface arrive as `?from=blog_<post-slug>` on the deal page and are
resolved against the registry by [`../app/lib/surface.ts`](../app/lib/surface.ts).
**Unrecognised values become `direct` and can never reach the marker** — a raw query string
reflected into an affiliate SubID would let anyone pollute the report.

This is what makes "which niche earns" answerable. Listing-id alone answers "which offer
earns", which is not the question the 12-week test asks.
