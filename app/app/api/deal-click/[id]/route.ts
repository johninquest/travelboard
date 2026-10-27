import { NextResponse } from "next/server";
import { getClickTarget } from "@/lib/store";
import { buildAffiliateUrl, readAffiliateConfig } from "@/lib/affiliate";

// GET /api/deal-click/<listingId> — logs the click, then redirects to the offer.
// The booking_url only ever exists server-side; the board links here, never to
// the supplier directly, so the funnel has one honest measurement point.
//
// The affiliate wrapper is applied here rather than stored, so the raw supplier
// URL stays the source of truth and the marker can change without a data edit.
// The listing id doubles as the affiliate SubID, which is what makes "which
// offer earns" answerable in the Travelpayouts report.
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

  const destination = target.bookingUrl || target.sourceUrl;
  const outbound = buildAffiliateUrl({
    network: target.affiliateNetwork,
    program: target.affiliateProgram,
    destinationUrl: destination,
    subId: id,
    config: readAffiliateConfig(),
  });

  console.log(
    JSON.stringify({
      event: "deal_click",
      listing: id,
      network: target.affiliateNetwork,
      program: target.affiliateProgram || null,
      // True only when the outbound URL actually carries our marker — a click
      // that earns nothing must be distinguishable from one that does.
      affiliate: outbound !== destination,
      ref: request.headers.get("referer") ?? "deal_page",
      at: new Date().toISOString(),
    })
  );

  if (outbound) return NextResponse.redirect(outbound);
  return NextResponse.redirect(new URL("/deals", url));
}
