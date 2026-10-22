// Weekly ingestion worker. Run with: npm run ingest
// Requires PB_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD in the environment
// (Node 24 auto-loads app/.env.local; --env-file-if-exists also picks up .env).
//
// It polls every travel_sources row with kind="feed" and allowed=true, parses the
// feed, and creates/refreshes needs_review drafts. It never publishes to `live` —
// that is the human curation step. Expiry is enforced here so a stale price can't
// linger on the board even if nobody reviews it.

import { pbAuthed } from "../lib/pb.ts";
import { ingestSource, loadFeedSources } from "../lib/ingest.ts";

async function main() {
  const pb = await pbAuthed();
  const sources = await loadFeedSources(pb);
  if (!sources.length) {
    console.log("No feed sources found. Seed travel_sources first (see pocketbase/schema.md).");
    return;
  }
  console.log(`Polling ${sources.length} feed source(s)…`);
  for (const source of sources) {
    const stats = await ingestSource(pb, source);
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
}

main().catch((err) => {
  console.error("ingest failed:", err);
  process.exit(1);
});
