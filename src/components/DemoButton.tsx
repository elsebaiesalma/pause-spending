"use client";

import { useState } from "react";

// Posts to /api/demo with a plain form (works before hydration too). Creating
// the account and its sample wardrobe takes a moment, so once submitted the
// button says so and can't be pressed twice.
export function DemoButton({
  label = "Try the demo",
  className = "btn btn-primary",
}: {
  label?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form action="/api/demo" method="POST" onSubmit={() => setPending(true)}>
      <button type="submit" className={className} disabled={pending} aria-busy={pending}>
        {pending ? "Setting up your closet…" : label}
      </button>
    </form>
  );
}
