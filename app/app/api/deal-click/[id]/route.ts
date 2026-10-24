import { NextResponse } from "next/server";
import { getClickTarget } from "@/lib/store";

// GET /api/deal-click/<listingId> — logs the click, then redirects to the offer.
// The booking_url only ever exists server-side; the board links here, never to
// the supplier directly, so the funnel has one honest measurement point.
//
// The click is recorded as a structured log line rather than a database write.
// That is enough to count clicks and see which offers convert; when the volume
// outgrows log parsing, this is the one place that needs to change.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const target = getClickTarget(id);

  if (!target) {
    console.warn(`[deal-click] unknown listing ${id}`);
    return NextResponse.redirect(new URL("/deals", url));
  }

  console.log(
    JSON.stringify({
      event: "deal_click",
      listing: id,
      ref: request.headers.get("referer") ?? "deal_page",
      at: new Date().toISOString(),
    })
  );

  if (target.bookingUrl) return NextResponse.redirect(target.bookingUrl);
  if (target.sourceUrl) return NextResponse.redirect(target.sourceUrl);
  return NextResponse.redirect(new URL("/deals", url));
}
