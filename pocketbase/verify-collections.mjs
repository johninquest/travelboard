// Independent verification that pocketbase/collections.json is importable by
// PocketBase. Run: node pocketbase/verify-collections.mjs
//
// Checks the constraints PocketBase enforces in core/collection_validate.go and
// core/field_validate.go. Deliberately does not import build-collections.mjs, so
// a bug in the generator cannot hide here.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const collections = JSON.parse(
  readFileSync(join(here, "collections.json"), "utf8"),
);

const ID_RE = /^[a-z0-9]{15}$/;
const errors = [];
const fail = (m) => errors.push(m);

if (!Array.isArray(collections)) fail("root must be an array");
if (collections.length === 0) fail("no collections to import");

const byName = new Map(collections.map((c) => [c.name, c]));

// Precompute so a relation may point at a collection defined later in the file.
const collectionIds = new Set();
for (const col of collections) {
  if (ID_RE.test(col.id ?? "")) collectionIds.add(col.id);
}

const seenCollectionIds = new Set();
const allFieldIds = new Set();

for (const col of collections) {
  const where = `collection ${col.name}`;

  if (!ID_RE.test(col.id ?? "")) fail(`${where}: invalid id "${col.id}"`);
  if (seenCollectionIds.has(col.id)) fail(`${where}: duplicate collection id`);
  seenCollectionIds.add(col.id);

  if (!col.name) fail(`collection at index ${collections.indexOf(col)}: missing name`);
  if (col.type !== "base") fail(`${where}: unexpected type "${col.type}"`);

  // PocketBase checks these exist; null means "inherit"/unrestricted.
  for (const rule of ["createRule", "listRule", "viewRule", "updateRule", "deleteRule"]) {
    if (!(rule in col)) fail(`${where}: missing ${rule}`);
  }

  // Every collection needs an `id` primary-key text field.
  const idFields = col.fields.filter((f) => f.name === "id");
  if (idFields.length !== 1) fail(`${where}: expected exactly one "id" field`);
  const pk = idFields[0];
  if (!pk || !pk.primaryKey) fail(`${where}: "id" field must have primaryKey: true`);
  if (!pk || !pk.system) fail(`${where}: "id" field must have system: true`);
  if (!pk || pk.type !== "text") fail(`${where}: "id" field must be type text`);
  if (!pk || pk.min !== 15 || pk.max !== 15) fail(`${where}: "id" field must be min/max 15`);

  const names = new Set();
  for (const f of col.fields) {
    const fw = `${where}.${f.name}`;

    if (!ID_RE.test(f.id ?? "")) fail(`${fw}: invalid field id "${f.id}"`);
    if (allFieldIds.has(f.id)) fail(`${fw}: duplicate field id across schema`);
    allFieldIds.add(f.id);

    if (!f.name) fail(`${where}: field missing name`);
    if (names.has(f.name)) fail(`${fw}: duplicate field name`);
    names.add(f.name);

    if (!f.type) fail(`${fw}: missing type`);

    const allowed = new Set([
      "text", "number", "bool", "email", "url", "date", "autodate",
      "select", "file", "relation", "json", "editor", "geoPoint",
    ]);
    if (!allowed.has(f.type)) fail(`${fw}: unknown type "${f.type}"`);

    if (f.type === "select") {
      if (!Array.isArray(f.values) || f.values.length === 0) fail(`${fw}: select has no values`);
      if (f.maxSelect > f.values.length) fail(`${fw}: maxSelect exceeds value count`);
    }

    if (f.type === "relation") {
      // PocketBase requires collectionId to be the exact 15-char id of an
      // existing collection. Names are NOT accepted at import time: the
      // validator uses FindCachedCollectionByNameOrId and then requires
      // relCollection.Id == value, so a name fails with
      // "The relation collection doesn't exist."
      if (!f.collectionId) {
        fail(`${fw}: relation missing collectionId`);
      } else if (!collectionIds.has(f.collectionId)) {
        fail(
          `${fw}: collectionId "${f.collectionId}" is not a collection id in this file ` +
            `(PocketBase requires the exact 15-char id, not a collection name)`,
        );
      }
      if (f.relationTarget !== undefined) {
        fail(`${fw}: internal relationTarget leaked into output`);
      }
    }

    if (f.type === "number") {
      if (f.min !== null && f.min !== undefined && typeof f.min !== "number") {
        fail(`${fw}: number min must be number|null`);
      }
    }
  }

  // Indexes must be parseable CREATE [UNIQUE] INDEX statements.
  if (!Array.isArray(col.indexes)) fail(`${where}: indexes must be an array`);
  for (const sql of col.indexes ?? []) {
    if (typeof sql !== "string") fail(`${where}: index must be a string`);
    else if (!/^CREATE (UNIQUE )?INDEX `[a-z0-9_]+` ON `[a-z0-9_]+` \(.+\)( WHERE .+)?$/.test(sql)) {
      fail(`${where}: unparseable index SQL: ${sql}`);
    } else if (/#/.test(sql)) {
      // PocketBase's index parser treats "#" as an unexpanded placeholder.
      fail(`${where}: index SQL contains unexpanded placeholder: ${sql}`);
    }
  }
}

if (errors.length) {
  console.error(`FAILED (${errors.length})`);
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}

const totalFields = collections.reduce((n, c) => n + c.fields.length, 0);
const totalIndexes = collections.reduce((n, c) => n + c.indexes.length, 0);
console.log(
  `OK — ${collections.length} collections, ${totalFields} fields, ` +
    `${totalIndexes} indexes; all ids 15-char [a-z0-9] and unique.`,
);
console.log("Collections: " + collections.map((c) => c.name).join(", "));
