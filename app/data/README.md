# `app/data/` — board data files

These files are the board's storage layer. `app/lib/store.ts` is the only module that
reads them, so swapping the storage backend means changing that one file.

| File | Purpose |
| --- | --- |
| `listings.json` | The offers the board renders. |
| `sources.json` | Where offers come from, and how long each source's offers stay fresh. |
| `candidates.json` | Output of `npm run ingest`. **Not** rendered — a staging area for review. |
| `season.json` | Season bands per destination, for `/where-to-look`. Every row names a source. |
| `platforms.json` | What each booking platform sells, for `/where-to-look`. Business-model facts only. |

## `season.json` and `platforms.json`

These two files back [`/where-to-look`](../app/app/where-to-look/page.tsx), which is a
**source guide, not an offer page**. They are validated at import by
[`../lib/season.ts`](../lib/season.ts) and [`../lib/platforms.ts`](../lib/platforms.ts), so a
typo fails the build rather than rendering a wrong claim.

**`season.json`** — one row per destination, `months` is exactly 12 entries (January first),
each `peak | shoulder | quiet | closed`. Every row needs a `source` and `sourceUrl`; a
destination with no named source does not go in the file at all, and the page reports it as
unsourced instead. `basis` is `corridor` when the source states a season for that specific
origin→destination pair, and `market` when it only states the origin market's calendar — the
page renders the weaker claim as weaker.

Portugal, Cyprus and Malta are **absent on purpose**: the research the matrix was seeded from
does not cover them. Do not add a row without a named source.

**`platforms.json`** — `sells` and `limitation` are statements about a company's **business
model**, which is stable and checkable on its own site. They are **not** availability claims.
"TUI sells its own package inventory" is a fact. "TUI has Crete in November" is not, and must
never be written here. `lastVerified` is the date the business model was read off the
company's site and renders next to each platform.

## Sample data (delete before launch)

`listings.json` currently contains **14 placeholder offers** (`sample-001` … `sample-014`)
so the board can be reviewed with realistic density. They are **not real offers**:

- Every row has `"source": "sample"` and a `notes` field reading
  `SAMPLE DATA - delete before launch.`
- Every `summary` says it is a placeholder, not a checked price.
- `booking_url` and `source_url` are empty, so clicking a row redirects back to `/deals`
  instead of sending anyone to a fake supplier.
- `confidence` is `"manual"`, not `"verified"`.

The matching `sample` entry in `sources.json` has `"kind": "sample"` and
`"allowed": false`. `npm run ingest` only polls sources whose `kind` is `"feed"`, so the
ingest worker will never fetch this source.

### Removing the sample data

1. Set `listings.json` back to an empty array:

   ```json
   []
   ```

2. Delete the `sample` object from the `sources` array in `sources.json`.

3. Confirm the board shows its empty state and that no `sample-*` URL is reachable.

Nothing else references the sample data, so those two edits are the whole removal.

## Adding real offers

`npm run ingest` writes **candidates**, never live offers. A feed item is discovery, not a
fact — the extractor never invents a price, so nothing it produces is safe to advertise.

Publishing is a separate, deliberate step:

```bash
npm run publish -- <candidate-id> --price 742 --program booking
```

| Flag | Meaning |
| --- | --- |
| `--price <eur>` | **Required.** The total price you read on the source page. |
| `--network <name>` | `travelpayouts` (default), `check24`, `awin`, `direct`, `none`. |
| `--program <key>` | Affiliate program key, e.g. `booking` or `kiwi`. |
| `--dry-run` | Print the row that would be written; change nothing. |

The command refuses to run without `--price`, refuses an offer whose travel window has
already ended, and refuses an offer with no destination. It moves the row from
`candidates.json` to `listings.json` with `status: "live"` and `confidence: "verified"`,
then you commit both files.

`affiliate_network` and `affiliate_program` are stored on the row; the actual affiliate URL
is built at click time (see [`../lib/affiliate.ts`](../lib/affiliate.ts)), so the stored
`booking_url` stays the raw supplier URL.

## Editing these files

Write them as UTF-8 **without a BOM**. A BOM makes `JSON.parse` fail during the Next.js
build. In PowerShell, use:

```powershell
[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
```

Note that `Set-Content -Encoding utf8` writes a BOM and will break the build. `npm run
publish` writes without a BOM for this reason.
