# Pocketbase schema — DEFERRED

> **Status: deferred, not in use.** The deals board no longer reads or writes
> PocketBase. It reads committed JSON through `app/lib/store.ts`
> (`app/data/listings.json`, `app/data/candidates.json`, `app/data/sources.json`),
> so a fresh clone runs with no database and no credentials.
>
> PocketBase is now only relevant to the legacy `/anfrage` request funnel, and
> only if `PB_URL` is set. Nothing below is required to run the board.
>
> **Revisit when** any of these becomes true: more than ~50 live listings, click
> volume that a structured log can't carry, or a second person curating. At that
> point `lib/store.ts` is the single swap point — the schema below is still the
> intended shape, and `app/data/*.json` already uses it.

Handoff spec for the **existing Pocketbase instance on the VPS**. Either create the
collections by hand from this document, drop [`schema.pb.js`](./schema.pb.js) into the
instance's `pb_hooks/` directory and restart, or import
[`collections.json`](./collections.json) from the dashboard (*Import collections*).

`collections.json` is **generated** — do not hand-edit it. Regenerate and check it with:

```sh
node pocketbase/build-collections.mjs    # writes collections.json
node pocketbase/verify-collections.mjs   # static importability check
```

Every collection and field carries a deterministic 15-char `[a-z0-9]` id, and every
`relation` field's `collectionId` is the **real id** of its target collection. Both matter:
the Admin UI rejects the file with *"Invalid collections configuration."* if any collection
lacks an `id`, and PocketBase rejects a relation whose `collectionId` is not an exact
collection id (a collection *name* fails with *"The relation collection doesn't exist."*).
Because ids are explicit, import order does not matter.

The hook creates everything below and renames itself to `schema.pb.js.done`, but only once
every collection in the spec exists — a partial failure leaves the hook in place and retries
on the next restart.

The hook was written and verified against **Pocketbase v0.40.5** (live test instance, full
run: collections, relations, field rules, unique indexes, idempotent re-run). If your
instance is older, upgrade first or expect API differences.

## Collections

All timestamps (`created`, `updated`) are Pocketbase system fields. Prices are EUR cents
not used — plain decimal euros (number fields). Every price record carries `last_checked`.

### `travel_requests` — what users asked for

| Field | Type | Notes |
| --- | --- | --- |
| `token` | text | shareable result-page token (`/r/[token]`); unique via index |
| `status` | select | `open` / `fulfilled` / `abandoned` |
| `source` | select | `find` (inspiration form) / `beat` (paste-a-deal form) |
| `criteria` | json | normalized form values (budget, nights, airports, month…) |
| `note` | text (max 2000) | free-text from the user, kept verbatim |
| `fulfilled_at` | date | when the request was answered |

Rules: `create` = `""` (anyone), `list`/`view`/`update`/`delete` = `null` (superuser only).
Index: `CREATE UNIQUE INDEX idx_requests_token ON travel_requests (token)`.

### `travel_trips` — a fulfilled human request (V0 funnel)

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | text | stable URL key; unique via index |
| `destination` | text | human name ("Crete") |
| `destination_code` | relation → `travel_destinations` | |
| `departure_airport` | select | `MUC` / `NUE` / `STR` / `FRA` |
| `country` | select | `ES` / `GR` / `TR` / `PT` / `IT` / `CY` / `MT` |
| `nights` | number (int, 1–30) | |
| `start_date` | date | |
| `travellers` | number (int, 1–9) | typically 2 |
| `price_total_eur` | number | total for the party |
| `price_ppp_eur` | number | per person |
| `currency` | text (max 3) | always `EUR` in scope |
| `verified` | bool | price re-checked against supplier |
| `fulfilled` | bool | published (drives the public-view rule) |
| `flight` | json | `{type, outbound, return, …}` — supplier quirks stay here |
| `hotel` | json | `{name, rating, area, …}` |
| `characteristics` | json | beach/food/nightlife/family/romance scores /10 |
| `logistics` | json | `{direct_flight, transfer_time_min, …}` |
| `justification` | json | why this trip, why this rank |
| `supplier` | text (max 40) | `amadeus` / `manual` / … |
| `supplier_ref` | text (max 120) | supplier-side id for re-verification |
| `last_checked` | date | staleness is always visible |
| `rank` | number (int) | position within its request |
| `request` | relation → `travel_requests` | optional; manual trips may have none |

Rules: `create`/`update`/`delete` = `null` (superuser only).
`list`/`view` = `@request.auth.id != "" || fulfilled = true` — anonymous visitors see only
published trips. Index: `CREATE UNIQUE INDEX idx_trips_slug ON travel_trips (slug)`.

### `travel_offers` — affiliate links, never exposed raw

| Field | Type | Notes |
| --- | --- | --- |
| `trip` | relation → `travel_trips` (cascade delete) | |
| `affiliate_url` | text | injected server-side at click time only |
| `network` | select | `travelpayouts` / `booking` / `direct` |
| `price_total_eur` | number | |
| `verified` | bool | |
| `last_checked` | date | |

Rules: all `null` (superuser only). The result page server-renders a redirect, it never
ships the URL to the client.

### `travel_clicks` — affiliate outbound clicks

| Field | Type | Notes |
| --- | --- | --- |
| `trip` | relation → `travel_trips` | |
| `offer` | relation → `travel_offers` | |
| `request` | relation → `travel_requests` | |
| `ref` | text (max 80) | short code in the redirect URL |
| `listing` | text (max 32) | V0.5: id of the clicked `travel_listings` row (plain text — nullable, V0 clicks don't set it) |

Rules: `create` = `""` (anyone — the redirect endpoint writes them), rest `null`.

### `travel_events` — funnel analytics

| Field | Type | Notes |
| --- | --- | --- |
| `name` | text (max 60) | `page_view`, `form_submit`, … |
| `props` | json | |
| `session_id` | text (max 80) | anonymous cookie id |
| `path` | text (max 300) | |

Rules: `create` = `""` (anyone), rest `null`.

### `travel_destinations` — reference data

| Field | Type | Notes |
| --- | --- | --- |
| `code` | text (max 10) | airport/region code; unique via index |
| `name` | text (max 80) | |
| `country` | select | same 7 values as `travel_trips` |
| `climate` | json | |
| `notes` | text (max 4000) | "avoid if…" content lives here |

Rules: `list`/`view` = `""` (anyone), rest `null`. Index:
`CREATE UNIQUE INDEX idx_destinations_code ON travel_destinations (code)`.

### `travel_sources` — where offers come from, and whether we may fetch them

The `allowed` flag is a **recorded human decision**, never inferred at runtime. The ingestion
worker must refuse to poll a source whose row is missing, `allowed = false`, or has no
`feed_url`. That is what keeps a future automated poller from crawling somewhere it isn't
permitted.

| Field | Type | Notes |
| --- | --- | --- |
| `name` | text | display name ("Urlaubspiraten") |
| `slug` | text (max 80) | URL key for `/quelle/<slug>/`; unique via index |
| `kind` | select | `feed` / `operator` / `manual` |
| `feed_url` | text (max 500) | RSS/Atom endpoint, if any |
| `robots_url` | text (max 500) | where the permission decision came from |
| `content_signal` | text (max 200) | verbatim `Content-Signal` header, e.g. `ai-train=yes, search=yes, ai-input=yes` |
| `attribution_url` | text (max 500) | link we show the reader |
| `allowed` | bool | **the gate** |
| `max_age_days` | number (int, 1–90) | hard expiry ceiling for this source's prices |
| `last_polled` | date | |
| `note` | text (max 2000) | the reasoning, in words |

Rules: `list`/`view` = `""` (anyone — attribution pages are public), `update`/`delete` =
`@request.auth.id != ""`, `create` = `null`.
Index: `CREATE UNIQUE INDEX idx_travel_sources_slug ON travel_sources (slug)`.

Verified-permitted starting rows (checked against live robots.txt, 2026):

| name | slug | feed_url | permission |
| --- | --- | --- | --- |
| Urlaubspiraten | `urlaubspiraten` | `https://www.urlaubspiraten.de/feed` | `UA=* Allow: /`; `Content-Signal: ai-train=yes, search=yes, ai-input=yes` |
| mydealz Reisen | `mydealz-reisen` | `https://www.mydealz.de/rss/gruppe/reisen` | `UA=*` allows `/`; the `Disallow: /` lines belong to named AI-bot blocks — **never impersonate those bots** |

### `travel_listings` — the deals board's Layer-2 core asset

One row = one normalised, dated, attributable offer. Everything the board renders reads from
here; supplier quirks stay in the JSON fields.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | text | our own wording |
| `slug` | text (max 120) | `/deal/<slug>/`; unique via index |
| `summary` | text (max 280) | **our own one-line summary** — never copied marketing prose (copyright guardrail) |
| `destination` | text (max 80) | human name ("Kreta") |
| `country` | text (max 4) | ISO alpha-2, free text: the board is Europe-wide, not the V0 seven-country set |
| `departure_airport` | text (max 5) | IATA; free text for the same reason |
| `nights` | number (int, 1–30) | |
| `travel_window` | json | `{start, end, label}` |
| `price_from_eur` | number | the operator's own stated "ab" price |
| `price_pp_eur` | number | per person |
| `currency` | text (max 3) | `EUR` |
| `travellers` | number (int, 1–9) | usually 2 |
| `accommodation` | json | `{name, category, board}` |
| `included` | json | array of strings — feeds the PAngV all-in statement |
| `excluded` | json | array of strings — what the price does **not** cover |
| `themes` | select multi (max 8) | `beach` / `all-inclusive` / `city` / `family` / `romance` / `last-minute` / `ski` / `cruise` |
| `source` | relation → `travel_sources` | |
| `source_url` | text (max 500) | the page we took the facts from |
| `source_guid` | text (max 255) | feed item id, for dedupe |
| `source_published_at` | date | drives auto-expiry |
| `booking_url` | text (max 500) | CHECK24 affiliate path; rendered server-side only |
| `affiliate_network` | select | `check24` / `awin` / `direct` / `none` |
| `status` | select | `live` / `expired` / `needs_review` — drives the public-view rule |
| `confidence` | select | `verified` (we checked) / `feed` (unreviewed import) / `manual` |
| `last_checked` | date | staleness is always visible |
| `notes` | text (max 4000) | |

Rules: `create` = `null`, `update`/`delete` = `@request.auth.id != ""`.
`list`/`view` = `@request.auth.id != "" || status = "live"` — an expired or
needs-review offer can never be served to the public, which is the mechanical guard against
advertising a stale price (UWG Anhang Nr. 5/6).

Indexes:
- `CREATE UNIQUE INDEX idx_travel_listings_slug ON travel_listings (slug)`
- `CREATE UNIQUE INDEX idx_travel_listings_guid ON travel_listings (source_guid) WHERE source_guid != ''` — partial, so hand-curated rows with no guid can coexist
- non-unique on `(status, last_checked)`, `country`, `departure_airport` for the board queries

## Auth model (v0.40 reality — no "superuser API key")

v0.40 has **no static superuser API key**. Two verified options:

1. **Email + password (recommended for the app).** The Next server authenticates as the
   superuser once per process:
   `POST /api/collections/_superusers/auth-with-password` `{identity, password}` → JWT
   (renewable via the SDK's auto-refresh). Put `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD`
   in `.env`; nothing is sent to the client.
2. **Impersonated token.** `POST /api/collections/_superusers/impersonate/{id}` (requires
   superuser auth) returns a fixed token — verified: **24h expiry, `refreshable: false`**.
   Only suitable for short-lived scripts, not the app.

## v0.40 API quirks (all verified empirically)

- `@request.auth != null` is **invalid** ("failed to resolve field") — use
  `@request.auth.id != ""` for "is authenticated".
- Request-payload rules use `@request.body.<field>`; the old `@request.data.<field>` is
  **invalid**.
- Text fields have **no `unique` property** — it is silently dropped. Uniqueness is enforced
  with collection **indexes** (`CREATE UNIQUE INDEX …`), which the hook adds in a final pass.
- Record routes are `/api/collections/{name}/records[/{id}]`; the legacy `/api/records/{name}`
  returns 404.
- Multi-field `expand` must be comma-separated in one param (`?expand=a,b`); repeated
  `expand[]=a&expand[]=b` returns no expand object.
- `Collection.addIndex(name, unique, fields, extra)` — `fields` is a comma-separated string
  and `extra` is trailing SQL, so a **partial unique index** works:
  `addIndex("idx_…", true, "source_guid", "WHERE source_guid != ''")`.
- Inside the JSVM, `Collection` has no `set()`/`get()` — mutate with the global
  `unmarshal(data, collection)` then `$app.save(collection)`. Records do have
  `set()`/`get()`. **`unmarshal` merges over the model in place, so a `null` in the data
  argument means "leave what is stored", not "clear it"** — pass 3 therefore writes all four
  rule fields explicitly for every collection it touches.
- JS hooks live in `pb_hooks/` (goja, ES5-style: no `import`/`export`), and the JSVM has no
  timer queue — long `setTimeout` callbacks never fire. Keep the hook one-shot.

## After the hook runs

1. Verify in the dashboard (`/_/`): 8 collections, relations wired, `travel_listings` list/view
   rule shows `@request.auth.id != "" || status = "live"`, indexes present.
2. Confirm `pb_hooks/schema.pb.js` was renamed to `schema.pb.js.done` (it self-renames at
   startup only once every collection exists; a "please restart the app manually" log line
   is normal).
3. Hand over `PB_URL` + superuser email/password (option 1 above) for `.env`.
4. To add fields later: re-copy `schema.pb.js` from the repo into `pb_hooks/` and restart —
   existing collections/fields/indexes are skipped, new ones are added.
5. Seed `travel_sources` with the two rows above, `allowed = true`, `max_age_days = 14`.

## Things not to do

- Don't make `travel_offers.affiliate_url` or `travel_listings.booking_url` publicly viewable;
  links go out server-side only.
- Don't poll a `travel_sources` row unless `allowed = true` and `feed_url` is set. The flag is
  a human decision recorded here, not something the worker should judge.
- Don't put prices in `travel_requests`; a request is a question, not an answer.
- Don't hand-edit the `travel_trips` view rule to `""` — publish with `fulfilled = true` instead.
- Don't set a `travel_listings` row to `live` while `confidence = "feed"` and `last_checked` is
  older than its source's `max_age_days`. Expire it or mark it `needs_review`.
