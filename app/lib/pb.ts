import PocketBase from "pocketbase";

// Server-only Pocketbase client. Reads env lazily so builds don't require the vars.
// All DB access goes through this module or the typed helpers below — collection
// names must not leak into feature code (see pocketbase/schema.md).

const PB_URL = () => process.env.PB_URL ?? "";

export function pbAdmin(): PocketBase {
  const pb = new PocketBase(PB_URL());
  return pb;
}

// Auth as superuser with email+password. v0.40 has no static API key and
// impersonate tokens expire in 24h, so this is the app credential.
// Call before any write. Returns the authenticated client.
export async function pbAuthed(): Promise<PocketBase> {
  const pb = pbAdmin();
  const email = process.env.PB_SUPERUSER_EMAIL;
  const password = process.env.PB_SUPERUSER_PASSWORD;
  if (!email || !password) {
    throw new Error("PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD not set");
  }
  // v0.40 expects `identity` (not `email`) in the auth payload.
  await pb.collection("_superusers").authWithPassword(email, password);
  return pb;
}

// Read-only client for public data (fulfilled trips, destinations).
// No auth — Pocketbase rules return only what anon may see.
export function pbPublic(): PocketBase {
  return new PocketBase(PB_URL());
}
