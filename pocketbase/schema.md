# Pocketbase schema — validation phase (V0/V1)

Handoff spec for the **existing Pocketbase instance on the VPS**. Either create the six
collections by hand from this document, or drop [`schema.pb.js`](./schema.pb.js) into the
instance's `pb_hooks/` directory and restart — the hook creates everything below and then
renames itself to `schema.pb.js.done` so it runs exactly once.

The hook was written and verified against **Pocketbase v0.40.5** (live test instance, full
run: 6 collections, 6 relations, 1 field-rule, 3 unique indexes, idempotent re-run). If your
instance is older, upgrade first or expect API differences.

## Collections

All timestamps (`created`, `updated`) are Pocketbase system fields. Prices are EUR cents
not used — plain decimal euros (number fields). Every price record carries `last_checked`.

### `requests` — what users asked for

| Field | Type | Notes |
| --- | --- | --- |
| `token` | text | shareable result-page token (`/r/[token]`); unique via index |
| `status` | select | `open` / `fulfilled` / `abandoned` |
| `source` | select | `find` (inspiration form) / `beat` (paste-a-deal form) |
| `criteria` | json | normalized form values (budget, nights, airports, month…) |
| `note` | text (max 2000) | free-text from the user, kept verbatim |
| `fulfilled_at` | date | when the request was answered |

Rules: `create` = `""` (anyone), `list`/`view`/`update`/`delete` = `null` (superuser only).
Index: `CREATE UNIQUE INDEX idx_requests_token ON requests (token)`.

### `trips` — the Layer-2 core asset

| Field | Type | Notes |
| --- | --- | --- |
| `slug` | text | stable URL key; unique via index |
| `destination` | text | human name ("Crete") |
| `destination_code` | relation → `destinations` | |
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
| `request` | relation → `requests` | optional; manual trips may have none |

Rules: `create`/`update`/`delete` = `null` (superuser only).
`list`/`view` = `@request.auth.id != "" || fulfilled = true` — anonymous visitors see only
published trips. Index: `CREATE UNIQUE INDEX idx_trips_slug ON trips (slug)`.

### `offers` — affiliate links, never exposed raw

| Field | Type | Notes |
| --- | --- | --- |
| `trip` | relation → `trips` (cascade delete) | |
| `affiliate_url` | text | injected server-side at click time only |
| `network` | select | `travelpayouts` / `booking` / `direct` |
| `price_total_eur` | number | |
| `verified` | bool | |
| `last_checked` | date | |

Rules: all `null` (superuser only). The result page server-renders a redirect, it never
ships the URL to the client.

### `clicks` — affiliate outbound clicks

| Field | Type | Notes |
| --- | --- | --- |
| `trip` | relation → `trips` | |
| `offer` | relation → `offers` | |
| `request` | relation → `requests` | |
| `ref` | text (max 80) | short code in the redirect URL |

Rules: `create` = `""` (anyone — the redirect endpoint writes them), rest `null`.

### `events` — funnel analytics

| Field | Type | Notes |
| --- | --- | --- |
| `name` | text (max 60) | `page_view`, `form_submit`, … |
| `props` | json | |
| `session_id` | text (max 80) | anonymous cookie id |
| `path` | text (max 300) | |

Rules: `create` = `""` (anyone), rest `null`.

### `destinations` — reference data

| Field | Type | Notes |
| --- | --- | --- |
| `code` | text (max 10) | airport/region code; unique via index |
| `name` | text (max 80) | |
| `country` | select | same 7 values as `trips` |
| `climate` | json | |
| `notes` | text (max 4000) | "avoid if…" content lives here |

Rules: `list`/`view` = `""` (anyone), rest `null`. Index:
`CREATE UNIQUE INDEX idx_destinations_code ON destinations (code)`.

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
- Inside the JSVM, `Collection` has no `set()`/`get()` — mutate with the global
  `unmarshal(data, collection)` then `$app.save(collection)`. Records do have
  `set()`/`get()`.
- JS hooks live in `pb_hooks/` (goja, ES5-style: no `import`/`export`), and the JSVM has no
  timer queue — long `setTimeout` callbacks never fire. Keep the hook one-shot.

## After the hook runs

1. Verify in the dashboard (`/_/`): 6 collections, relations wired, `trips` list/view rule
   shows `@request.auth.id != "" || fulfilled = true`, 3 unique indexes present.
2. Confirm `pb_hooks/schema.pb.js` was renamed to `schema.pb.js.done` (it self-renames at
   startup; a "please restart the app manually" log line is normal).
3. Hand over `PB_URL` + superuser email/password (option 1 above) for `.env`.
4. To add fields later: re-copy `schema.pb.js` from the repo into `pb_hooks/` and restart —
   existing collections/fields/indexes are skipped, new ones are added.

## Things not to do

- Don't make `offers.affiliate_url` publicly viewable; links go out server-side only.
- Don't put prices in `requests`; a request is a question, not an answer.
- Don't hand-edit the `trips` view rule to `""` — publish with `fulfilled = true` instead.
