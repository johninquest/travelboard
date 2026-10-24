// Ingestion worker. Run with: npm run ingest
// No database and no credentials — it reads data/sources.json, polls each feed,
// and writes the merged candidate set to data/candidates.json.
//
// It never publishes to `live`. A feed item is discovery, not a fact: promoting
// a candidate means moving it into data/listings.json with status "live" and
// confidence "verified" after checking the price on the source page. Expiry is
// enforced here so a stale price can't linger in the queue even if nobody
// reviews it.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ingestSource } from "../lib/ingest.ts";
import type { SourceRecord } from "../lib/store.ts";

// This script runs under plain Node, not through the bundler, so it reads the
// JSON files itself instead of importing lib/store.ts — that module uses the
// "@/" path alias and extensionless imports, neither of which Node resolves.
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const CANDIDATES = join(DATA_DIR, "candidates.json");
const SOURCES = join(DATA_DIR, "sources.json");

async function readJsonArray(path: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function main() {
  const sources = (await readJsonArray(SOURCES)) as unknown as SourceRecord[];
  const feeds = sources.filter((s) => s.kind === "feed");
  if (!feeds.length) {
    console.log("No feed sources configured. Add one to data/sources.json.");
    return;
  }

  let candidates = await readJsonArray(CANDIDATES);
  console.log(`Polling ${feeds.length} feed source(s)…`);

  for (const source of feeds) {
    const { stats, candidates: next } = await ingestSource(source, candidates);
    candidates = next;
    if (stats.skipped === "not_allowed") {
      console.log(`- ${stats.source}: skipped (allowed=false)`);
    } else if (stats.error) {
      console.log(`- ${stats.source}: ERROR ${stats.error}`);
    } else if (stats.notModified) {
      console.log(`- ${stats.source}: not modified`);
    } else {
      console.log(
        `- ${stats.source}: ${stats.fetched} items, ${stats.created} new, ${stats.refreshed} refreshed, ${stats.unchanged} unchanged, ${stats.expired} expired`
      );
    }
  }

  await writeFile(CANDIDATES, `${JSON.stringify(candidates, null, 2)}\n`, "utf8");
  console.log(`Wrote ${candidates.length} candidate(s) to data/candidates.json.`);
  console.log("Review them, then move the verified ones into data/listings.json with status \"live\".");
}

main().catch((err) => {
  console.error("ingest failed:", err);
  process.exit(1);
});
