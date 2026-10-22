"use client";

import { useEffect } from "react";
import { trackPageView } from "@/lib/track";

// One beacon per page view, no third-party script. Server-rendered pages stay
// fully functional without JS — the beacon is pure measurement.
export function PageViewTracker() {
  useEffect(() => {
    trackPageView(window.location.pathname);
  }, []);
  return null;
}
