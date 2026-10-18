import { NextResponse } from "next/server";
import { pbAuthed } from "@/lib/pb";

// Admin writes: fulfill a request with hand-found trips.
// POST /api/admin  action=fulfill  request=<id>  trips=<JSON array of trip objects>
export async function POST(request: Request) {
  const fd = await request.formData();
  const action = fd.get("action");
  const pb = await pbAuthed();

  if (action === "fulfill") {
    const requestId = String(fd.get("request"));
    const req = (await pb.collection("requests").getOne(requestId)) as Record<string, unknown>;
    const trips = JSON.parse(String(fd.get("trips") ?? "[]"));
    for (const t of trips) {
      await pb.collection("trips").create({ ...t, request: req["id"], fulfilled: true });
    }
    await pb.collection("requests").update(requestId, { status: "fulfilled" });
  }

  return NextResponse.redirect(new URL("/admin", request.url));
}
