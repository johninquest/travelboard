/// <reference path="../pb_data/types.d.ts" />

/**
 * Creates the validation-phase collections, then renames itself to
 * `schema.pb.js.done` so it runs exactly once.
 *
 * Usage: copy this file into `pb_hooks/` next to the pocketbase executable and restart.
 * Written and verified against Pocketbase v0.40.5.
 *
 * Two groups live in this file:
 * - V0 (travel_requests, travel_trips, travel_offers, travel_clicks, travel_events,
 *   travel_destinations) — the human-fulfilled request funnel, already imported.
 * - V0.5 (travel_sources, travel_listings) — the deals board. `travel_listings` is the
 *   new Layer-2 core asset: one normalised, dated, attributable offer per row.
 *
 * Idempotent: existing collections and fields are skipped, so re-copying the file to add
 * fields later is safe.
 *
 * Style notes (both are goja constraints, not taste):
 * - no ES module support, so `var` and function declarations only
 * - each handler runs in an isolated context, so all logic lives in one onBootstrap handler
 *
 * Rule syntax verified on a live v0.40.5 instance:
 * - `@request.auth != null` is REJECTED ("failed to resolve field") — use
 *   `@request.auth.id != ""` for "is authenticated"
 * - request payload is `@request.body.<field>`, not the older `@request.data.<field>`
 * - a rule referencing a field can only be saved once that field exists on the collection,
 *   which is why the public-view rule is applied in pass 3 rather than at creation
 */

onBootstrap((e) => {
  e.next()

  // ---- schema ---------------------------------------------------------------
  // Fields are plain JSON field objects; `new Collection()` accepts a `fields` array
  // directly (see core.Collection.UnmarshalJSON).
  var COLLECTIONS = [
    {
      name: "travel_requests",
      createRule: "",
      // Anonymous read by unguessable token: the result page must be able to
      // tell "open" from "fulfilled" without an account.
      listRule: "",
      viewRule: "",
      fields: [
        { type: "text", name: "token", presentable: true },
        { type: "select", name: "status", maxSelect: 1, values: ["open", "fulfilled", "abandoned"] },
        { type: "select", name: "source", maxSelect: 1, values: ["find", "beat"] },
        { type: "json", name: "criteria" },
        { type: "text", name: "note", max: 2000 },
        { type: "date", name: "fulfilled_at" },
      ],
    },
    {
      name: "travel_trips",
      createRule: null,
      // set in pass 3, after the `fulfilled` field exists
      listRule: null,
      viewRule: null,
      fields: [
        { type: "text", name: "slug", presentable: true },
        { type: "text", name: "destination" },
        { type: "select", name: "departure_airport", maxSelect: 1, values: ["MUC", "NUE", "STR", "FRA"] },
        { type: "select", name: "country", maxSelect: 1, values: ["ES", "GR", "TR", "PT", "IT", "CY", "MT"] },
        { type: "number", name: "nights", onlyInt: true, min: 1, max: 30 },
        { type: "date", name: "start_date" },
        { type: "number", name: "travellers", onlyInt: true, min: 1, max: 9 },
        { type: "number", name: "price_total_eur", min: 0 },
        { type: "number", name: "price_ppp_eur", min: 0 },
        { type: "text", name: "currency", max: 3 },
        { type: "bool", name: "verified" },
        { type: "bool", name: "fulfilled" },
        { type: "json", name: "flight" },
        { type: "json", name: "hotel" },
        { type: "json", name: "characteristics" },
        { type: "json", name: "logistics" },
        { type: "json", name: "justification" },
        { type: "text", name: "supplier", max: 40 },
        { type: "text", name: "supplier_ref", max: 120 },
        { type: "date", name: "last_checked" },
        { type: "number", name: "rank", onlyInt: true },
      ],
    },
    {
      name: "travel_offers",
      createRule: null,
      listRule: null,
      viewRule: null,
      fields: [
        { type: "text", name: "affiliate_url" },
        { type: "select", name: "network", maxSelect: 1, values: ["travelpayouts", "booking", "direct"] },
        { type: "number", name: "price_total_eur", min: 0 },
        { type: "bool", name: "verified" },
        { type: "date", name: "last_checked" },
      ],
    },
    {
      name: "travel_clicks",
      createRule: "",
      listRule: null,
      viewRule: null,
      fields: [
        { type: "text", name: "ref", max: 80 },
      ],
    },
    {
      name: "travel_events",
      createRule: "",
      listRule: null,
      viewRule: null,
      fields: [
        { type: "text", name: "name", max: 60, presentable: true },
        { type: "json", name: "props" },
        { type: "text", name: "session_id", max: 80 },
        { type: "text", name: "path", max: 300 },
      ],
    },
    {
      name: "travel_destinations",
      createRule: null,
      listRule: "",
      viewRule: "",
      fields: [
        { type: "text", name: "code", max: 10, presentable: true },
        { type: "text", name: "name", max: 80 },
        { type: "select", name: "country", maxSelect: 1, values: ["ES", "GR", "TR", "PT", "IT", "CY", "MT"] },
        { type: "json", name: "climate" },
        { type: "text", name: "notes", max: 4000 },
      ],
    },

    // ---- V0.5: the deals board ----------------------------------------------
    // `allowed` on a source is a *recorded human decision*, never inferred at runtime:
    // a poller must refuse to fetch a source whose row is missing or allowed=false.
    {
      name: "travel_sources",
      createRule: null,
      listRule: "",
      viewRule: "",
      fields: [
        { type: "text", name: "name", presentable: true },
        { type: "text", name: "slug", max: 80 },
        { type: "select", name: "kind", maxSelect: 1, values: ["feed", "operator", "manual"] },
        { type: "text", name: "feed_url", max: 500 },
        { type: "text", name: "robots_url", max: 500 },
        // verbatim Content-Signal header, e.g. "ai-train=yes, search=yes, ai-input=yes"
        { type: "text", name: "content_signal", max: 200 },
        { type: "text", name: "attribution_url", max: 500 },
        { type: "bool", name: "allowed" },
        // hard ceiling on how old a price may be advertised as (UWG Anhang Nr. 5/6)
        { type: "number", name: "max_age_days", onlyInt: true, min: 1, max: 90 },
        { type: "date", name: "last_polled" },
        { type: "text", name: "note", max: 2000 },
      ],
    },
    {
      name: "travel_listings",
      createRule: null,
      // set in pass 3, after the `status` field exists
      listRule: null,
      viewRule: null,
      fields: [
        { type: "text", name: "title", presentable: true },
        { type: "text", name: "slug", max: 120 },
        // our own one-line summary. Never copied marketing prose (copyright guardrail).
        { type: "text", name: "summary", max: 280 },
        { type: "text", name: "destination", max: 80 },
        // ISO alpha-2, free text: the board is Europe-wide, not the V0 seven-country set.
        { type: "text", name: "country", max: 4 },
        { type: "text", name: "departure_airport", max: 5 },
        { type: "number", name: "nights", onlyInt: true, min: 1, max: 30 },
        // { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "label": "20 Aug - 27 Aug 2026" }
        { type: "json", name: "travel_window" },
        { type: "number", name: "price_from_eur", min: 0 },
        { type: "number", name: "price_pp_eur", min: 0 },
        { type: "text", name: "currency", max: 3 },
        { type: "number", name: "travellers", onlyInt: true, min: 1, max: 9 },
        // { "name": "...", "category": 4, "board": "all inclusive" }
        { type: "json", name: "accommodation" },
        { type: "json", name: "included" },
        { type: "json", name: "excluded" },
        { type: "select", name: "themes", maxSelect: 8, values: ["beach", "all-inclusive", "city", "family", "romance", "last-minute", "ski", "cruise"] },
        { type: "text", name: "source_url", max: 500 },
        { type: "text", name: "source_guid", max: 255 },
        { type: "date", name: "source_published_at" },
        { type: "text", name: "booking_url", max: 500 },
        { type: "select", name: "affiliate_network", maxSelect: 1, values: ["check24", "awin", "direct", "none"] },
        { type: "select", name: "status", maxSelect: 1, values: ["live", "expired", "needs_review"] },
        { type: "select", name: "confidence", maxSelect: 1, values: ["verified", "feed", "manual"] },
        { type: "date", name: "last_checked" },
        { type: "text", name: "notes", max: 4000 },
      ],
    },
  ];

  // Relations are added in a second pass, once every target collection has an id.
  var RELATIONS = [
    { collection: "travel_trips", field: "destination_code", target: "travel_destinations", maxSelect: 1, cascadeDelete: false },
    { collection: "travel_trips", field: "request", target: "travel_requests", maxSelect: 1, cascadeDelete: false },
    { collection: "travel_offers", field: "trip", target: "travel_trips", maxSelect: 1, cascadeDelete: true },
    { collection: "travel_clicks", field: "trip", target: "travel_trips", maxSelect: 1, cascadeDelete: false },
    { collection: "travel_clicks", field: "offer", target: "travel_offers", maxSelect: 1, cascadeDelete: false },
    { collection: "travel_clicks", field: "request", target: "travel_requests", maxSelect: 1, cascadeDelete: false },
    { collection: "travel_listings", field: "source", target: "travel_sources", maxSelect: 1, cascadeDelete: false },
  ];

  // Rules and indexes applied after all fields exist.
  // v0.40 text fields have no `unique` property — uniqueness is enforced by collection
  // indexes (verified: field unique:true is silently dropped; indexes are enforced).
  // `unmarshal` merges over the model in-place (verified on a live v0.40.5 instance),
  // so a null here means "leave whatever is stored" — pass 3 therefore writes both
  // rules explicitly for every collection it touches.
  var DEFERRED_RULES = [
    {
      collection: "travel_trips",
      listRule: '@request.auth.id != "" || fulfilled = true',
      viewRule: '@request.auth.id != "" || fulfilled = true',
      updateRule: null,
      deleteRule: null,
    },
    {
      collection: "travel_listings",
      // Anonymous readers see live offers only; expired/needs_review stay superuser-only
      // so a stale price can never be served to the public.
      listRule: '@request.auth.id != "" || status = "live"',
      viewRule: '@request.auth.id != "" || status = "live"',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    },
    {
      collection: "travel_sources",
      listRule: "",
      viewRule: "",
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
    },
  ];

  // v0.40 indexes are raw SQL kept on the collection; `extra` carries a partial-index
  // WHERE clause so feed-less (manual) rows with an empty source_guid can coexist.
  var DEFERRED_INDEXES = [
    { collection: "travel_requests", name: "idx_travel_requests_token", column: "token", unique: true, extra: "" },
    { collection: "travel_trips", name: "idx_travel_trips_slug", column: "slug", unique: true, extra: "" },
    { collection: "travel_destinations", name: "idx_travel_destinations_code", column: "code", unique: true, extra: "" },
    { collection: "travel_sources", name: "idx_travel_sources_slug", column: "slug", unique: true, extra: "" },
    { collection: "travel_listings", name: "idx_travel_listings_slug", column: "slug", unique: true, extra: "" },
    { collection: "travel_listings", name: "idx_travel_listings_guid", column: "source_guid", unique: true, extra: "WHERE source_guid != ''" },
    { collection: "travel_listings", name: "idx_travel_listings_status_checked", column: "status, last_checked", unique: false, extra: "" },
    { collection: "travel_listings", name: "idx_travel_listings_country", column: "country", unique: false, extra: "" },
    { collection: "travel_listings", name: "idx_travel_listings_departure", column: "departure_airport", unique: false, extra: "" },
  ];

  try {
    // Guarded rename, so a partial failure CAN be retried by restarting.
    // Only mark the hook done once every collection in the spec already exists.
    var allPresent = true
    for (var g = 0; g < COLLECTIONS.length; g++) {
      try {
        $app.findCollectionByNameOrId(COLLECTIONS[g].name)
      } catch (missing) {
        allPresent = false
      }
    }
    if (allPresent) {
      try {
        $os.rename(__hooks + "/schema.pb.js", __hooks + "/schema.pb.js.done")
        console.log("[schema] all collections present — renamed hook to schema.pb.js.done")
      } catch (renameErr) {
        console.log("[schema] hook not auto-renamed (already renamed?) — continuing")
      }
    } else {
      console.log("[schema] schema incomplete — hook left in place, will re-run on next restart")
    }

    var created = 0
    var skipped = 0

    // Pass 1: collections and their plain fields.
    for (var i = 0; i < COLLECTIONS.length; i++) {
      var spec = COLLECTIONS[i]

      var existing = null
      try {
        existing = $app.findCollectionByNameOrId(spec.name)
      } catch (notFound) {
        existing = null
      }

      if (existing) {
        skipped++
        console.log("[schema] " + spec.name + ": exists, checking fields")

        for (var k = 0; k < spec.fields.length; k++) {
          var want = spec.fields[k]
          if (existing.fields.getByName(want.name)) continue
          existing.fields.add(new Field(want))
          $app.save(existing)
          console.log("[schema]   " + spec.name + "." + want.name + ": added")
        }
        continue
      }

      var collection = new Collection({
        type: "base",
        name: spec.name,
        fields: spec.fields,
        createRule: spec.createRule,
        listRule: spec.listRule,
        viewRule: spec.viewRule,
        updateRule: null,
        deleteRule: null,
      })
      $app.save(collection)
      created++
      console.log("[schema] " + spec.name + ": created with " + spec.fields.length + " fields")
    }

    // Pass 2: relations.
    for (var r = 0; r < RELATIONS.length; r++) {
      var rel = RELATIONS[r]
      var col = $app.findCollectionByNameOrId(rel.collection)

      if (col.fields.getByName(rel.field)) {
        console.log("[schema]   " + rel.collection + "." + rel.field + ": relation exists")
        continue
      }

      var target = $app.findCollectionByNameOrId(rel.target)

      col.fields.add(new RelationField({
        name: rel.field,
        collectionId: target.id,
        maxSelect: rel.maxSelect,
        cascadeDelete: rel.cascadeDelete,
      }))
      $app.save(col)
      console.log("[schema]   " + rel.collection + "." + rel.field + ": relation -> " + rel.target)
    }

    // Pass 3: rules that reference fields.
    for (var d = 0; d < DEFERRED_RULES.length; d++) {
      var dr = DEFERRED_RULES[d]
      var dcol = $app.findCollectionByNameOrId(dr.collection)

      if (
        dcol.listRule === dr.listRule &&
        dcol.viewRule === dr.viewRule &&
        dcol.updateRule === dr.updateRule &&
        dcol.deleteRule === dr.deleteRule
      ) {
        console.log("[schema]   " + dr.collection + ": rules already set")
        continue
      }

      // v0.40's Collection JS binding has no set()/get(); unmarshal merges data over
      // the model in-place (see types.d.ts "unmarshal clones and merges the data
      // argument on top of dst").
      unmarshal(
        {
          listRule: dr.listRule,
          viewRule: dr.viewRule,
          updateRule: dr.updateRule,
          deleteRule: dr.deleteRule,
        },
        dcol
      )
      $app.save(dcol)
      console.log("[schema]   " + dr.collection + ": rules set")
    }

    // Pass 4: indexes (added idempotently by name).
    for (var x = 0; x < DEFERRED_INDEXES.length; x++) {
      var spec2 = DEFERRED_INDEXES[x]
      var icol = $app.findCollectionByNameOrId(spec2.collection)

      var already = false
      var ix = icol.indexes
      for (var y = 0; y < ix.length; y++) {
        if (ix[y].indexOf(spec2.name) !== -1) { already = true; break }
      }
      if (already) {
        console.log("[schema]   index " + spec2.name + ": exists")
        continue
      }

      // addIndex(name, unique, fields, extra) — `extra` is the trailing SQL, used here
      // for the partial-index WHERE clause on source_guid.
      icol.addIndex(spec2.name, spec2.unique, spec2.column, spec2.extra)
      $app.save(icol)
      console.log("[schema]   index " + spec2.name + " (" + spec2.collection + "." + spec2.column + "): created")
    }

    console.log("[schema] done — " + created + " created, " + skipped + " already existed")
    console.log("[schema] safe to restart. This hook will not run again.")
  } catch (err) {
    console.log("[schema] FAILED: " + err)
    console.log("[schema] collections may be partially created — fix and re-copy schema.pb.js")
  }
})
