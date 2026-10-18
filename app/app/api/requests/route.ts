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
    // Pocketbase not reachable/configured — V0 falls back to a pending page
    // instead of losing the user's intent.
    return NextResponse.redirect(
      new URL(`/r/pending?source=${parsed.data.source}`, request.url),
      303,
    );
  }

  return NextResponse.redirect(new URL(`/r/${token}`, request.url), 303);
}
