"use client";

import { usePathname } from "next/navigation";
import { StartOverButton } from "@/components/StartOverButton";

// A slim, informational strip on every signed-in page of a demo account, so
// nobody mistakes the sample closet for real data. "Start over" makes a fresh
// demo account (the old one simply stops being used).
export function DemoBanner() {
  // The landing page is marketing, not the app, so it never carries the strip.
  if (usePathname() === "/") return null;
  return (
    <div className="demo-banner" role="note">
      <p>
        You&apos;re exploring a sample closet. Nothing here is real, and nothing is shared with other
        visitors.
      </p>
      <StartOverButton label="Start over" className="demo-banner__action" />
    </div>
  );
}
