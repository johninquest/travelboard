// Publish a reviewed candidate to the board. Run with: npm run publish -- <id> --price 742
//
// This is the one step that turns discovery into an advertised fact, so it is
// deliberately hard to do by accident:
//
//   - `--price` is REQUIRED. The operator has looked at the source page; the
//     extractor has not. A feed item is discovery, never a fact, and this is the
//     mechanical enforcement of that rule — there is no way to publish a number
//     nobody verified.
//   - An offer whose travel window has already ended is refused.
//   - An offer with no destination is refused: it cannot be filtered or found.
//
// It writes UTF-8 without a BOM. A BOM makes JSON.parse fail during the Next.js
// build (see data/README.md), and PowerShell's Set-Content adds one.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const CANDIDATES = join(DATA_DIR, "candidates.json");
const LISTINGS = join(DATA_DIR, "listings.json");

const NETWORKS = ["travelpayouts", "check24", "awin", "direct", "none"];

type Args = {
  id: string;
  price: number | null;
  network: string;
  program: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { id: "", price: null, network: "travelpayouts", program: "", dryRun: false };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--price") args.price = Number(argv[++i]);
    else if (a === "--network") args.network = argv[++i] ?? "";
    else if (a === "--program") args.program = argv[++i] ?? "";
    else if (a.startsWith("--")) throw new Error(`Unknown flag: ${a}`);
    else rest.push(a);
  }
  args.id = rest[0] ?? "";
  return args;
}

function usage(): string {
  return [
    "Usage: npm run publish -- <candidate-id-or-slug> --price <eur> [options]",
    "",
    "  --price <eur>        REQUIRED. The total price you saw on the source page.",
    "  --network <name>     travelpayouts | check24 | awin | direct | none  (default: travelpayouts)",
    "  --program <key>      Affiliate program key, e.g. booking | kiwi",
    "  --dry-run            Print the row that would be written; change nothing.",
    "",
    "Example:",
    "  npm run publish -- urlaubspiraten-kreta-20261020 --price 742 --program booking",
  ].join("\n");
}

async function readJsonArray(path: string): Promise<Record<string, unknown>[]> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// UTF-8, no BOM. Set-Content -Encoding utf8 would add one and break the build.
async function writeJsonArray(path: string, rows: Record<string, unknown>[]): Promise<void> {
  await writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, { encoding: "utf8" });
}

function windowEnded(rec: Record<string, unknown>, now: Date): boolean {
  const w = rec["travel_window"] as { end?: string } | null | undefined;
  const end = w?.end;
  if (!end) return false;
  const t = new Date(end.length === 10 ? `${end}T23:59:59Z` : end).getTime();
  return Number.isFinite(t) && t < now.getTime();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.id) {
    console.error(usage());
    process.exit(1);
  }
  if (args.price == null || !Number.isFinite(args.price) || args.price <= 0) {
    console.error(
      "Refusing to publish without a verified price.\n" +
        "Open the source page, read the total, and pass it with --price.\n" +
        "A feed item is discovery, never a fact.\n"
    );
    console.error(usage());
    process.exit(1);
  }
  if (!NETWORKS.includes(args.network)) {
    console.error(`Unknown --network "${args.network}". Expected one of: ${NETWORKS.join(", ")}`);
    process.exit(1);
  }

  const candidates = await readJsonArray(CANDIDATES);
  const listings = await readJsonArray(LISTINGS);

  const idx = candidates.findIndex((c) => c["id"] === args.id || c["slug"] === args.id);
  if (idx === -1) {
    console.error(`No candidate matching "${args.id}" in data/candidates.json.`);
    console.error("Run `npm run ingest` first, or check the id at /admin.");
    process.exit(1);
  }

  const candidate = candidates[idx];
  const now = new Date();

  if (windowEnded(candidate, now)) {
    console.error(
      `Refusing to publish "${args.id}": its travel window has already ended. ` +
        "Advertising a window that has passed is a Lockangebot (UWG Anhang Nr. 5)."
    );
    process.exit(1);
  }
  if (!candidate["destination"]) {
    console.error(
      `Refusing to publish "${args.id}": no destination. An offer with no destination ` +
        "cannot be filtered or found. Set it by hand in data/candidates.json first."
    );
    process.exit(1);
  }

  const id = String(candidate["id"] ?? args.id);
  if (listings.some((l) => l["id"] === id)) {
    console.error(`"${id}" is already on the board in data/listings.json.`);
    process.exit(1);
  }

  const row: Record<string, unknown> = {
    ...candidate,
    id,
    price_from_eur: args.price,
    price_pp_eur:
      typeof candidate["travellers"] === "number" && (candidate["travellers"] as number) > 1
        ? Math.round(args.price / (candidate["travellers"] as number))
        : args.price,
    affiliate_network: args.network,
    affiliate_program: args.program,
    status: "live",
    confidence: "verified",
    last_checked: now.toISOString(),
    notes: `Price verified by hand on the source page on ${now.toISOString().slice(0, 10)}.`,
  };

  if (args.dryRun) {
    console.log("--dry-run: nothing written. Row that would be published:\n");
    console.log(JSON.stringify(row, null, 2));
    return;
  }

  listings.push(row);
  candidates.splice(idx, 1);

  await writeJsonArray(LISTINGS, listings);
  await writeJsonArray(CANDIDATES, candidates);

  console.log(`Published "${id}" to data/listings.json (${listings.length} live row(s)).`);
  console.log(`Removed it from data/candidates.json (${candidates.length} left in the queue).`);
  console.log("Commit both files to deploy the offer.");
}

main().catch((err) => {
  console.error("publish failed:", err);
  process.exit(1);
});
