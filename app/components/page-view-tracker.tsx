"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView } from "@/lib/track";

// One beacon per page view, no third-party script. Server-rendered pages stay
// fully functional without JS — the beacon is pure measurement.
//
// The pathname is a dependency on purpose. This component sits in the root layout,
// which App Router keeps mounted across navigations, so an empty dependency array
// fired once per document load and never on a client-side move: board → guide →
// offer produced one page_view for three views. That under-counts visits while
// clicks keep counting in full, which inflates the outbound-clicks-per-100-visits
// number the keep/kill decision in docs/strategy.md is made on.
//
// Search is excluded deliberately. `?from=` changes on offer links and would log the
// same page twice; the query is attribution, not a different page.
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
