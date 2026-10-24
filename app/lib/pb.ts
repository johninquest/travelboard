import PocketBase from "pocketbase";

// Server-only Pocketbase client. Reads env lazily so builds don't require the vars.
// All DB access goes through this module or the typed helpers below — collection
// names must not leak into feature code (see pocketbase/schema.md).
//
// Pocketbase is NOT on the critical path. The deals board reads committed JSON
// (see lib/store.ts) and needs none of this. What is left here serves only the
// legacy /anfrage request funnel, which is optional: when PB_URL is unset the
// funnel degrades to its "we're on it" page instead of erroring.

const PB_URL = () => process.env.PB_URL ?? "";

// Is a Pocketbase instance configured at all? Callers use this to take the
// no-database path deliberately rather than by catching a connection error.
export function pbConfigured(): boolean {
  return PB_URL().length > 0;
}

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
