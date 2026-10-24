import { randomBytes } from "node:crypto";
import { pbAdmin, pbConfigured } from "@/lib/pb";
import type { Criteria } from "@/lib/criteria";

// Creates a `requests` row and returns its token for /r/[token].
// Anonymous create is allowed by the schema rules; list/view is superuser-only.
//
// The /anfrage funnel is a legacy path and Pocketbase is optional: with no
// PB_URL configured there is nowhere to persist the request, so return the
// shared "pending" token. The caller routes that to /r/pending, which tells the
// user we have their criteria without pretending we stored them.
export async function createRequest(criteria: Criteria): Promise<string> {
  const token = randomBytes(12).toString("base64url");
  if (!pbConfigured()) return "pending";
  const pb = pbAdmin();
  await pb.collection("travel_requests").create({
    token,
    status: "open",
    source: criteria.source,
    criteria,
  });
  return token;
}
