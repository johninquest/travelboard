import { randomBytes } from "node:crypto";
import { pbAdmin } from "@/lib/pb";
import type { Criteria } from "@/lib/criteria";

// Creates a `requests` row and returns its token for /r/[token].
// Anonymous create is allowed by the schema rules; list/view is superuser-only.
export async function createRequest(criteria: Criteria): Promise<string> {
  const token = randomBytes(12).toString("base64url");
  const pb = pbAdmin();
  await pb.collection("travel_requests").create({
    token,
    status: "open",
    source: criteria.source,
    criteria,
  });
  return token;
}
