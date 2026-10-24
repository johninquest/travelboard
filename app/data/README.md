# `app/data/` — board data files

These files are the board's storage layer. `app/lib/store.ts` is the only module that
reads them, so swapping the storage backend means changing that one file.

| File | Purpose |
| --- | --- |
| `listings.json` | The offers the board renders. |
| `sources.json` | Where offers come from, and how long each source's offers stay fresh. |
| `candidates.json` | Output of `npm run ingest`. **Not** rendered — a staging area for review. |

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

Real offers are written by the ingest pipeline, not by hand. See
[`../README.md`](../README.md) for the PocketBase schema, source seeding, and the
`npm run ingest` workflow.

## Editing these files

Write them as UTF-8 **without a BOM**. A BOM makes `JSON.parse` fail during the Next.js
build. In PowerShell, use:

```powershell
[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))
```

Note that `Set-Content -Encoding utf8` writes a BOM and will break the build.
