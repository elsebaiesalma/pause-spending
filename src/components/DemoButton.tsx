"use client";

import { useState } from "react";

// A plain POST form (works before hydration too). Creating a demo account or
// a sample item takes a moment, so once submitted the button says so and can't
// be pressed twice.
export function DemoButton({
  label = "Try the demo",
  pendingLabel = "Setting up your closet…",
  action = "/api/demo",
  className = "btn btn-primary",
}: {
  label?: string;
  pendingLabel?: string;
  action?: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form action={action} method="POST" onSubmit={() => setPending(true)}>
      <button type="submit" className={className} disabled={pending} aria-busy={pending}>
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
