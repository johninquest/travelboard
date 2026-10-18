import { NextResponse } from "next/server";
import { pbAuthed } from "@/lib/pb";

// Affiliate click redirect: record the click, then bounce to the offer.
// GET /api/click?trip=<id>&ref=<source>
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tripId = url.searchParams.get("trip");
  const ref = url.searchParams.get("ref") ?? "result_page";
  if (!tripId) {
    return NextResponse.redirect(new URL("/", url));
  }
  let affiliate: string | null = null;
  try {
    const pb = await pbAuthed();
    const trip = (await pb.collection("trips").getOne(tripId)) as Record<string, unknown>;
    const offers = await pb
      .collection("offers")
      .getList(1, 1, { filter: `trip="${tripId}"`, sort: "-id" });
    affiliate = offers.items[0]?.affiliate_url ?? null;
    if (affiliate) {
      await pb.collection("clicks").create({
        trip: tripId,
        offer: offers.items[0]?.id ?? "",
        request: trip["request"] ?? "",
        ref,
      });
    }
  } catch (e) {
    console.error("[click] failed:", (e as { status?: number; message?: string })?.status, (e as Error)?.message, JSON.stringify((e as { data?: unknown })?.data ?? ""));
  }
  if (!affiliate) {
    return NextResponse.redirect(new URL("/", url));
  }
  return NextResponse.redirect(affiliate);
}
