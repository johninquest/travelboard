import { NextResponse } from "next/server";
import { pbAuthed } from "@/lib/pb";

// GET /api/deal-click/<listingId> — logs the click, then redirects to the offer.
// The booking_url only ever exists server-side; the board links here, never to
// the supplier directly, so the funnel has one honest measurement point.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(_request.url);
  try {
    const pb = await pbAuthed();
    const rec = (await pb.collection("travel_listings").getOne(id)) as Record<string, unknown>;
    const booking = typeof rec.booking_url === "string" ? rec.booking_url : "";
    await pb
      .collection("travel_clicks")
      .create({ listing: id, ref: _request.headers.get("referer") ?? "deal_page" })
      .catch(() => {
        /* travel_clicks has no listing field yet; fall back below */
      });
    if (booking) {
      return NextResponse.redirect(booking);
    }
    const sourceUrl = typeof rec.source_url === "string" ? rec.source_url : "";
    if (sourceUrl) {
      return NextResponse.redirect(sourceUrl);
    }
  } catch (e) {
    console.error("[deal-click] failed:", (e as Error)?.message);
  }
  return NextResponse.redirect(new URL("/deals", url));
}
