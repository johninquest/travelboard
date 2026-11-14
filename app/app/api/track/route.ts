import { NextResponse } from "next/server";
import { pbAdmin, pbConfigured } from "@/lib/pb";

// Fire-and-forget funnel events. Client calls navigator.sendBeacon("/api/track", ...).
// Stored in the `travel_events` collection; anon create is allowed by schema rules.
//
// Tracking is measurement, never part of the product. A browser beacon that comes
// back non-2xx only paints a red line in the user's console, so the two states
// where we deliberately store nothing — no PocketBase configured, schema not
// imported — answer 204 and are logged server-side instead. A real transport
// failure stays a 502, because that one is worth seeing.

// One line per process, not one per page view: an un-imported schema would
// otherwise log on every request and bury everything else.
let warnedMissingCollection = false;

const NO_CONTENT = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  let body: { name?: string; props?: Record<string, unknown>; sessionId?: string };
  try {
    body = await request.json();
  } catch (e) {
    console.error("[track] bad JSON:", (e as Error)?.message);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string" || body.name.length > 100) {
    console.error("[track] invalid name:", JSON.stringify(body).slice(0, 200));
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // No database at all is a supported configuration (see lib/pb.ts), not an error.
  if (!pbConfigured()) return NO_CONTENT();

  try {
    const pb = pbAdmin();
    await pb.collection("travel_events").create({
      name: body.name,
      props: body.props ?? {},
      session_id: body.sessionId ?? "",
    });
  } catch (e) {
    const err = e as { status?: number; message?: string; data?: unknown };

    // PocketBase answers 404 when the collection is absent — i.e. the schema in
    // pocketbase/collections.json was never imported. Events are dropped rather
    // than retried, which is the intended behaviour for analytics.
    if (err?.status === 404) {
      if (!warnedMissingCollection) {
        console.warn(
          "[track] travel_events is missing on this PocketBase instance — import " +
            "pocketbase/collections.json. Funnel events are being dropped."
        );
        warnedMissingCollection = true;
      }
      return NO_CONTENT();
    }

    // Tracking must never break the user's flow, but must not fail silently.
    console.error("[track] PB create failed:", err?.status, err?.message, JSON.stringify(err?.data ?? ""));
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NO_CONTENT();
}
