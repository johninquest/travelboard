import { Suspense } from "react";
import type { Metadata } from "next";
import { WhereToLookBody, WhereToLookSkeleton } from "@/components/where-to-look";
import { SITE_URL } from "@/lib/site";

// Kept as a live URL, but `/` is the front door and renders the same body. The
// canonical points at `/` so the two do not compete for the same query.
//
// The page is month-scoped, so it changes on the first of every month. It carries
// no offers, which is why it is not gated by the ≥3-offers rule: its data is a
// sourced season matrix and a verified platform registry, not a thin offer list.
// See the 2026-11-20 entry in docs/decision-log.md.

export const metadata: Metadata = {
  title: "Where to look for a package holiday this month",
  description:
    "Which of our destinations are in season right now, and which kind of booking site carries that inventory. No prices, no availability claims — business models only.",
  alternates: { canonical: SITE_URL },
};

export default function WhereToLookPage() {
  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-8">
      <Suspense fallback={<WhereToLookSkeleton />}>
        <WhereToLookBody />
      </Suspense>
    </main>
  );
}
