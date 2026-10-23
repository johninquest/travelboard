// Generates pocketbase/collections.json — the PocketBase Admin UI import file.
//
// Why this exists: an earlier collections.json was hand-maintained with every
// `id` set to null, which the Admin UI rejects with "Invalid collections
// configuration." (its isRawValid getter requires every collection to have a
// truthy id and name; null ids also collapse under filterDuplicatesByKey).
// Regenerating from a single spec keeps ids valid and deterministic instead of
// relying on hand-editing.
//
// Source of truth: schema.pb.js, which is documented as verified against a live
// PocketBase v0.40.5 instance.
//
// Usage: node pocketbase/build-collections.mjs
// Verify: node pocketbase/verify-collections.mjs

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// PocketBase ids are exactly 15 chars of [a-z0-9].
const ID_LENGTH = 15;
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Deterministic ids. Derived from a seed so regenerating produces a stable
 * file (no churn in git), but still well distributed.
 */
function makeId(seed) {
  const digest = createHash("sha256").update(seed).digest();
  let out = "";
  for (let i = 0; out.length < ID_LENGTH; i++) {
    out += ID_ALPHABET[digest[i % digest.length] % ID_ALPHABET.length];
  }
  return out;
}

// Shared defaults. These mirror what the Admin UI writes on export.
const baseField = { hidden: false, presentable: false, system: false };

const text = (name, opts = {}) => ({
  ...baseField,
  type: "text",
  name,
  autogeneratePattern: "",
  max: opts.max ?? 0,
  min: 0,
  pattern: "",
  primaryKey: false,
  required: false,
});

const number = (name, opts = {}) => {
  const field = {
    ...baseField,
    type: "number",
    name,
    min: opts.min ?? null,
    max: opts.max ?? null,
  };
  if (opts.onlyInt) field.onlyInt = true;
  return field;
};

const bool = (name) => ({ ...baseField, type: "bool", name, required: false });

const date = (name) => ({ ...baseField, type: "date", name, min: "", max: "" });

const json = (name) => ({
  ...baseField,
  type: "json",
  name,
  maxSize: 2000000,
  required: false,
});

const select = (name, values, opts = {}) => ({
  ...baseField,
  type: "select",
  name,
  maxSelect: opts.maxSelect ?? 1,
  values,
});

const relation = (name, target, opts = {}) => ({
  ...baseField,
  type: "relation",
  name,
  // `relationTarget` is the target collection *name*; it is replaced with that
  // collection's real 15-char id during assembly below. PocketBase validates
  // `collectionId` with FindCachedCollectionByNameOrId and requires it to be an
  // exact collection id, so a name (or any "@collection:..." form) is rejected
  // with `The relation collection doesn't exist.`
  relationTarget: target,
  cascadeDelete: opts.cascadeDelete ?? false,
  minSelect: opts.minSelect ?? 0,
  maxSelect: opts.maxSelect ?? 1,
});

// ---------------------------------------------------------------------------
// The schema. Field order matches schema.pb.js.
// `presentable: true` marks the display field in relation pickers.
// ---------------------------------------------------------------------------

const COLLECTIONS = [
  {
    name: "travel_requests",
    createRule: "",
    listRule: "",
    viewRule: "",
    updateRule: null,
    deleteRule: null,
    fields: [
      { ...text("token"), presentable: true },
      select("status", ["open", "fulfilled", "abandoned"]),
      select("source", ["find", "beat"]),
      json("criteria"),
      text("note", { max: 2000 }),
      date("fulfilled_at"),
    ],
    indexes: [
      { name: "idx_travel_requests_token", unique: true, column: "token", extra: "" },
    ],
  },
  {
    name: "travel_trips",
    createRule: null,
    // set in pass 3 of schema.pb.js, once `fulfilled` exists
    listRule: '@request.auth.id != "" || fulfilled = true',
    viewRule: '@request.auth.id != "" || fulfilled = true',
    updateRule: null,
    deleteRule: null,
    fields: [
      { ...text("slug"), presentable: true },
      text("destination"),
      select("departure_airport", ["MUC", "NUE", "STR", "FRA"]),
      select("country", ["ES", "GR", "TR", "PT", "IT", "CY", "MT"]),
      number("nights", { onlyInt: true, min: 1, max: 30 }),
      date("start_date"),
      number("travellers", { onlyInt: true, min: 1, max: 9 }),
      number("price_total_eur", { min: 0 }),
      number("price_ppp_eur", { min: 0 }),
      text("currency", { max: 3 }),
      bool("verified"),
      bool("fulfilled"),
      json("flight"),
      json("hotel"),
      json("characteristics"),
      json("logistics"),
      json("justification"),
      text("supplier", { max: 40 }),
      text("supplier_ref", { max: 120 }),
      date("last_checked"),
      number("rank", { onlyInt: true }),
      relation("destination_code", "travel_destinations"),
      relation("request", "travel_requests"),
    ],
    indexes: [
      { name: "idx_travel_trips_slug", unique: true, column: "slug", extra: "" },
    ],
  },
  {
    name: "travel_offers",
    createRule: null,
    listRule: null,
    viewRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      text("affiliate_url"),
      select("network", ["travelpayouts", "booking", "direct"]),
      number("price_total_eur", { min: 0 }),
      bool("verified"),
      date("last_checked"),
      relation("trip", "travel_trips", { cascadeDelete: true }),
    ],
    indexes: [],
  },
  {
    name: "travel_clicks",
    createRule: "",
    listRule: null,
    viewRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      text("ref", { max: 80 }),
      // V0.5: clicks on the deals board. Plain text, not a relation — board
      // clicks must still be logged if the listing row is later removed.
      text("listing", { max: 32 }),
      relation("trip", "travel_trips"),
      relation("offer", "travel_offers"),
      relation("request", "travel_requests"),
    ],
    indexes: [],
  },
  {
    name: "travel_events",
    createRule: "",
    listRule: null,
    viewRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { ...text("name", { max: 60 }), presentable: true },
      json("props"),
      text("session_id", { max: 80 }),
      text("path", { max: 300 }),
    ],
    indexes: [],
  },
  {
    name: "travel_destinations",
    createRule: null,
    listRule: "",
    viewRule: "",
    updateRule: null,
    deleteRule: null,
    fields: [
      { ...text("code", { max: 10 }), presentable: true },
      text("name", { max: 80 }),
      select("country", ["ES", "GR", "TR", "PT", "IT", "CY", "MT"]),
      json("climate"),
      text("notes", { max: 4000 }),
    ],
    indexes: [
      { name: "idx_travel_destinations_code", unique: true, column: "code", extra: "" },
    ],
  },

  // ---- V0.5: the deals board ----------------------------------------------
  {
    name: "travel_sources",
    createRule: null,
    listRule: "",
    viewRule: "",
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { ...text("name"), presentable: true },
      text("slug", { max: 80 }),
      select("kind", ["feed", "operator", "manual"]),
      text("feed_url", { max: 500 }),
      text("robots_url", { max: 500 }),
      // verbatim Content-Signal header, e.g. "ai-train=yes, search=yes"
      text("content_signal", { max: 200 }),
      text("attribution_url", { max: 500 }),
      bool("allowed"),
      // hard ceiling on how old a price may be advertised as (UWG Anhang Nr. 5/6)
      number("max_age_days", { onlyInt: true, min: 1, max: 90 }),
      date("last_polled"),
      text("note", { max: 2000 }),
    ],
    indexes: [
      { name: "idx_travel_sources_slug", unique: true, column: "slug", extra: "" },
    ],
  },
  {
    name: "travel_listings",
    createRule: null,
    // Anonymous readers see live offers only; expired/needs_review stay
    // superuser-only so a stale price can never be served to the public.
    listRule: '@request.auth.id != "" || status = "live"',
    viewRule: '@request.auth.id != "" || status = "live"',
    updateRule: '@request.auth.id != ""',
    deleteRule: '@request.auth.id != ""',
    fields: [
      { ...text("title"), presentable: true },
      text("slug", { max: 120 }),
      // our own one-line summary. Never copied marketing prose (copyright guardrail).
      text("summary", { max: 280 }),
      text("destination", { max: 80 }),
      // ISO alpha-2, free text: the board is Europe-wide, not the V0 seven-country set.
      text("country", { max: 4 }),
      text("departure_airport", { max: 5 }),
      number("nights", { onlyInt: true, min: 1, max: 30 }),
      // { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "label": "..." }
      json("travel_window"),
      number("price_from_eur", { min: 0 }),
      number("price_pp_eur", { min: 0 }),
      text("currency", { max: 3 }),
      number("travellers", { onlyInt: true, min: 1, max: 9 }),
      // { "name": "...", "category": 4, "board": "all inclusive" }
      json("accommodation"),
      json("included"),
      json("excluded"),
      select(
        "themes",
        [
          "beach",
          "all-inclusive",
          "city",
          "family",
          "romance",
          "last-minute",
          "ski",
          "cruise",
        ],
        { maxSelect: 8 },
      ),
      text("source_url", { max: 500 }),
      text("source_guid", { max: 255 }),
      date("source_published_at"),
      text("booking_url", { max: 500 }),
      select("affiliate_network", ["check24", "awin", "direct", "none"]),
      select("status", ["live", "expired", "needs_review"]),
      select("confidence", ["verified", "feed", "manual"]),
      date("last_checked"),
      text("notes", { max: 4000 }),
      relation("source", "travel_sources"),
    ],
    indexes: [
      { name: "idx_travel_listings_slug", unique: true, column: "slug", extra: "" },
      // partial index so feed-less (manual) rows with an empty source_guid coexist
      {
        name: "idx_travel_listings_guid",
        unique: true,
        column: "source_guid",
        extra: "WHERE source_guid != ''",
      },
      {
        name: "idx_travel_listings_status_checked",
        unique: false,
        column: "status, last_checked",
        extra: "",
      },
      {
        name: "idx_travel_listings_country",
        unique: false,
        column: "country",
        extra: "",
      },
      {
        name: "idx_travel_listings_departure",
        unique: false,
        column: "departure_airport",
        extra: "",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Assemble. Every id is derived from a stable seed so the file is regenerable.
// ---------------------------------------------------------------------------

const collectionIds = new Map();
for (const col of COLLECTIONS) {
  collectionIds.set(col.name, makeId(`collection:${col.name}`));
}

const seenIds = new Set();

function claimId(seed, label) {
  const id = makeId(seed);
  if (seenIds.has(id)) {
    throw new Error(`id collision for ${label}: ${id}`);
  }
  seenIds.add(id);
  return id;
}

const output = COLLECTIONS.map((col) => {
  const id = claimId(`collection:${col.name}`, col.name);

  const fields = [
    // PocketBase requires an `id` PK field on every collection.
    {
      ...baseField,
      id: claimId(`field:${col.name}:id`, `${col.name}.id`),
      type: "text",
      name: "id",
      autogeneratePattern: "[a-z0-9]{15}",
      hidden: true,
      max: 15,
      min: 15,
      pattern: "^[a-z0-9]+$",
      presentable: false,
      primaryKey: true,
      required: true,
      system: true,
    },
    ...col.fields.map((f) => {
      const field = { ...f };
      if (field.type === "relation") {
        const targetId = collectionIds.get(field.relationTarget);
        if (!targetId) {
          throw new Error(
            `unknown relation target "${field.relationTarget}" for ${col.name}.${field.name}`,
          );
        }
        delete field.relationTarget;
        field.collectionId = targetId;
      }
      return {
        ...field,
        id: claimId(`field:${col.name}:${f.name}`, `${col.name}.${f.name}`),
      };
    }),
  ];

  return {
    id,
    name: col.name,
    type: "base",
    fields,
    indexes: col.indexes.map((ix) => {
      const base = ix.unique
        ? `CREATE UNIQUE INDEX \`${ix.name}\` ON \`${col.name}\` (${ix.column})`
        : `CREATE INDEX \`${ix.name}\` ON \`${col.name}\` (${ix.column})`;
      return `${base}${ix.extra ? ` ${ix.extra}` : ""}`.replace(/;+$/, "");
    }),
    createRule: col.createRule,
    listRule: col.listRule,
    viewRule: col.viewRule,
    updateRule: col.updateRule,
    deleteRule: col.deleteRule,
    // Admin UI bookkeeping. Not required for import, but the UI writes these.
    system: false,
  };
});

writeFileSync(
  join(here, "collections.json"),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

// ---------------------------------------------------------------------------
// Self-check: refuse to emit a file PocketBase would reject.
// ---------------------------------------------------------------------------

const ID_RE = /^[a-z0-9]{15}$/;
const errors = [];

for (const col of output) {
  if (!ID_RE.test(col.id)) errors.push(`bad collection id: ${col.name} -> ${col.id}`);

  for (const f of col.fields) {
    if (!ID_RE.test(f.id)) errors.push(`bad field id: ${col.name}.${f.name} -> ${f.id}`);
    if (f.type === "relation") {
      const target = [...collectionIds.entries()].find(([, id]) => id === f.collectionId);
      if (!target) {
        errors.push(`dangling relation: ${col.name}.${f.name} -> ${f.collectionId}`);
      }
    }
  }

  const ids = col.fields.map((f) => f.id);
  if (new Set(ids).size !== ids.length) {
    errors.push(`duplicate field ids in ${col.name}`);
  }
}

if (errors.length) {
  for (const e of errors) console.error(`FAIL ${e}`);
  process.exit(1);
}

const totalFields = output.reduce((n, c) => n + c.fields.length, 0);
console.log(
  `collections.json written: ${output.length} collections, ${totalFields} fields, ` +
    `${output.reduce((n, c) => n + c.indexes.length, 0)} indexes`,
);
