import { Suspense } from "react";
import type { Metadata } from "next";
import { WhereToLookBody, WhereToLookSkeleton } from "@/components/where-to-look";
import { LatestGuides } from "@/components/latest-guides";

// The front door is the source guide, not the board. The board is 14 placeholder
// rows with no verified prices; this page answers a question with data we actually
// have (a sourced season matrix and a verified platform registry) and needs no
// curation. The board stays at /deals, which is its canonical URL.
//
// /where-to-look renders the same body and canonicalises here.

export const metadata: Metadata = {
  title: "Where to look for a package holiday this month",
  description:
    "Which of our destinations are in season right now, and which kind of booking site carries that inventory. No prices, no availability claims — business models only.",
};

export default function Home() {
  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-8">
      <Suspense fallback={<WhereToLookSkeleton />}>
        <WhereToLookBody />
      </Suspense>

      {/* Below the guide on purpose: the writing is the test, so it stays visible
          without a nav click. Renders nothing when there are no posts. */}
      <LatestGuides />
    </main>
  );
}
