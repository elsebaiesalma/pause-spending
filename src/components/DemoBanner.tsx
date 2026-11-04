import { StartOverButton } from "@/components/StartOverButton";

// A slim, informational strip on every signed-in page of a demo account, so
// nobody mistakes the sample closet for real data. "Start over" makes a fresh
// demo account (the old one simply stops being used).
export function DemoBanner() {
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
