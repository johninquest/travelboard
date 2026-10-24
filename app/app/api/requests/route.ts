import { NextRequest, NextResponse } from "next/server";
import { parseCriteria } from "@/components/forms";
import { createRequest } from "@/lib/requests";

// Request capture endpoint: the landing forms POST here, we persist the
// criteria and redirect to the user's result page.
export async function POST(request: NextRequest) {
  const fd = await request.formData();
  const parsed = parseCriteria(fd);
  if (!parsed.success) {
    return NextResponse.redirect(new URL("/?error=invalid", request.url), 303);
  }

  let token: string;
  try {
    token = await createRequest(parsed.data);
  } catch {
    // Pocketbase configured but unreachable — V0 falls back to a pending page
    // instead of losing the user's intent. (No PB_URL at all is not an error:
    // createRequest returns "pending" and we land on the same page.)
    return NextResponse.redirect(
      new URL(`/r/pending?source=${parsed.data.source}`, request.url),
      303,
    );
  }

  return NextResponse.redirect(new URL(`/r/${token}`, request.url), 303);
}
