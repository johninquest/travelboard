/// <reference path="../pb_data/types.d.ts" />

/**
 * Creates the six validation-phase collections, then renames itself to
 * `schema.pb.js.done` so it runs exactly once.
 *
 * Usage: copy this file into `pb_hooks/` next to the pocketbase executable.
 * Written and verified against Pocketbase v0.40.5.
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
      name: "requests",
      createRule: "",
      listRule: null,
      viewRule: null,
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
      name: "trips",
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
      name: "offers",
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
      name: "clicks",
      createRule: "",
      listRule: null,
      viewRule: null,
      fields: [
        { type: "text", name: "ref", max: 80 },
      ],
    },
    {
      name: "events",
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
      name: "destinations",
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
  ];

  // Relations are added in a second pass, once every target collection has an id.
  var RELATIONS = [
    { collection: "trips", field: "destination_code", target: "destinations", maxSelect: 1, cascadeDelete: false },
    { collection: "trips", field: "request", target: "requests", maxSelect: 1, cascadeDelete: false },
    { collection: "offers", field: "trip", target: "trips", maxSelect: 1, cascadeDelete: true },
    { collection: "clicks", field: "trip", target: "trips", maxSelect: 1, cascadeDelete: false },
    { collection: "clicks", field: "offer", target: "offers", maxSelect: 1, cascadeDelete: false },
    { collection: "clicks", field: "request", target: "requests", maxSelect: 1, cascadeDelete: false },
  ];

  // Rules and indexes applied after all fields exist.
  // v0.40 text fields have no `unique` property — uniqueness is enforced by collection
  // indexes (verified: field unique:true is silently dropped; indexes are enforced).
  var DEFERRED_RULES = [
    {
      collection: "trips",
      listRule: '@request.auth.id != "" || fulfilled = true',
      viewRule: '@request.auth.id != "" || fulfilled = true',
    },
  ];

  var DEFERRED_INDEXES = [
    "CREATE UNIQUE INDEX idx_requests_token ON requests (token)",
    "CREATE UNIQUE INDEX idx_trips_slug ON trips (slug)",
    "CREATE UNIQUE INDEX idx_destinations_code ON destinations (code)",
  ];

  try {
    // Rename before doing any work, so a partial failure still cannot re-run on reboot.
    // Re-copy schema.pb.js from the repo to retry.
    try {
      $os.rename(__hooks + "/schema.pb.js", __hooks + "/schema.pb.js.done")
      console.log("[schema] renamed hook to schema.pb.js.done")
    } catch (renameErr) {
      console.log("[schema] hook not auto-renamed (already renamed?) — continuing")
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

      if (dcol.listRule === dr.listRule && dcol.viewRule === dr.viewRule) {
        console.log("[schema]   " + dr.collection + ": rules already set")
        continue
      }

      // v0.40's Collection JS binding has no set()/get(); unmarshal merges data over
      // the model in-place (see types.d.ts "unmarshal clones and merges the data
      // argument on top of dst").
      unmarshal({ listRule: dr.listRule, viewRule: dr.viewRule }, dcol)
      $app.save(dcol)
      console.log("[schema]   " + dr.collection + ": view/list rules set")
    }

    // Pass 4: unique indexes (added idempotently by name).
    for (var x = 0; x < DEFERRED_INDEXES.length; x++) {
      var stmt = DEFERRED_INDEXES[x]
      var idxName = stmt.match(/INDEX (\w+)/)[1]
      var idxCol = stmt.match(/ ON (\w+) /)[1]
      var icol = $app.findCollectionByNameOrId(idxCol)

      var already = false
      var ix = icol.indexes
      for (var y = 0; y < ix.length; y++) {
        if (ix[y].indexOf(idxName) !== -1) { already = true; break }
      }
      if (already) {
        console.log("[schema]   index " + idxName + ": exists")
        continue
      }

      icol.addIndex(idxName, true, stmt.match(/ ON (\w+) \((\w+)\)/)[2], "")
      $app.save(icol)
      console.log("[schema]   index " + idxName + " (" + idxCol + "." + stmt.match(/ \((\w+)\)/)[1] + "): created")
    }

    console.log("[schema] done — " + created + " created, " + skipped + " already existed")
    console.log("[schema] safe to restart. This hook will not run again.")
  } catch (err) {
    console.log("[schema] FAILED: " + err)
    console.log("[schema] collections may be partially created — fix and re-copy schema.pb.js")
  }
})
