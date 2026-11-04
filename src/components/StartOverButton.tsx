"use client";

import { useRef, useState } from "react";

// "Start over with a fresh closet" for demo accounts. It throws away this
// demo's decisions and looks, so it asks first, in a native <dialog> (Polaris
// destructive modal: a plain question, the destructive action named, and a
// way out that is just as easy to press).
export function StartOverButton({ label, className, role }: { label: string; className: string; role?: "menuitem" }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      <button type="button" className={className} role={role} onClick={() => dialogRef.current?.showModal()}>
        {label}
      </button>
      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="start-over-title">
        <h2 id="start-over-title" className="confirm-dialog__title">
          Start over with a fresh closet?
        </h2>
        <p className="confirm-dialog__body">
          Everything you did in this demo, including decisions and looks, will be cleared. You&apos;ll get a new sample
          closet.
        </p>
        <div className="confirm-dialog__actions">
          <button type="button" className="btn" onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <form action="/api/demo" method="POST" onSubmit={() => setPending(true)}>
            <button type="submit" className="btn btn-danger" disabled={pending} aria-busy={pending}>
              {pending ? "Starting over…" : "Start over"}
            </button>
          </form>
        </div>
      </dialog>
    </>
  );
}
