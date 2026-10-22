import { NextResponse } from "next/server";
import { pbAuthed } from "@/lib/pb";

// Admin writes: curation decisions on listings, fulfill a request with
// hand-found trips. Form posts (no JS) so the queue works from a phone.
export async function POST(request: Request) {
  const fd = await request.formData();
  const action = fd.get("action");
  const pb = await pbAuthed();

  if (action === "listing_decision") {
    const id = String(fd.get("listing"));
    const decision = String(fd.get("decision"));
    if (decision === "live") {
      // A human has now looked at the offer — that's what "verified" means.
      // last_checked is stamped so the board can show staleness honestly.
      await pb.collection("travel_listings").update(id, {
        status: "live",
        confidence: "verified",
        last_checked: new Date().toISOString(),
      });
    } else if (decision === "expired") {
      await pb.collection("travel_listings").update(id, { status: "expired" });
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (action === "fulfill") {
    const requestId = String(fd.get("request"));
    const req = (await pb.collection("travel_requests").getOne(requestId)) as Record<string, unknown>;
    const trips = JSON.parse(String(fd.get("trips") ?? "[]"));
    for (const t of trips) {
      await pb.collection("travel_trips").create({ ...t, request: req["id"], fulfilled: true });
    }
    await pb.collection("travel_requests").update(requestId, { status: "fulfilled" });
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}
