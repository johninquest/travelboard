import { connection } from "next/server";
import { pbAuthed } from "@/lib/pb";

// Blocking route: reads open requests live on every load.
export const instant = false;
// Deliberately thin: raw data lives in Pocketbase's own dashboard. This page
// exists so fulfillment (find open request → paste 3–5 trips → mark fulfilled)
// takes one minute, not ten. No client-side auth — this route must only be
// reachable behind the VPS (or add PB_ADMIN_PASSWORD gate before exposing).
export default async function AdminPage() {
  await connection();
  let open: Record<string, unknown>[] = [];
  let error = "";
  try {
    const pb = await pbAuthed();
    const res = await pb
      .collection("travel_requests")
      .getList(1, 50, { filter: "status='open'", sort: "-id" });
    open = res.items;
  } catch (e) {
    error = e instanceof Error ? e.message : "Pocketbase unreachable";
  }

  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-12 flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">Fulfillment</h1>
      {error && <p className="text-sm text-danger">{error}</p>}
      {open.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">No open requests.</p>
      )}
      {open.map((r) => (
        <article
          key={String(r["id"])}
          className="rounded-(--radius-card) border border-border bg-surface p-4"
        >
          <p className="text-sm font-medium">
            {String(r["source"])} ·{" "}
            <a href={`/r/${String(r["token"])}`} className="text-primary underline">
              /r/{String(r["token"])}
            </a>
          </p>
          <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(r["criteria"], null, 2)}</pre>
        </article>
      ))}
    </main>
  );
}
