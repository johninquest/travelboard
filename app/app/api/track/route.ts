import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pb";

// Fire-and-forget funnel events. Client calls navigator.sendBeacon("/api/track", ...).
// Stored in the `events` collection; anon create is allowed by schema rules.
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
  try {
    const pb = pbAdmin();
    await pb.collection("travel_events").create({
      name: body.name,
      props: body.props ?? {},
      session_id: body.sessionId ?? "",
    });
  } catch (e) {
    // Tracking must never break the user's flow, but must not fail silently.
    console.error("[track] PB create failed:", (e as { status?: number; message?: string; data?: unknown })?.status, (e as { message?: string })?.message, JSON.stringify((e as { data?: unknown })?.data ?? ""));
    return NextResponse.json({ ok: false }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
