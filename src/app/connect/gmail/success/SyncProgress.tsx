"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SyncState = { status: "syncing" } | { status: "error"; message: string };

// The sync pipeline (src/lib/sync/syncGmailConnection.ts) runs as one
// blocking call and only reports a final count - there's no step-by-step
// event stream to render true progress against. So this shows a calm,
// honest sequence of what's actually happening, not a fabricated percentage,
// and moves on the instant the real request resolves.
const PHASES = [
  "Reading recent order confirmations…",
  "Matching items to clothing, shoes, and accessories…",
  "Building your closet…",
];

export function SyncProgress() {
  const router = useRouter();
  const [state, setState] = useState<SyncState>({ status: "syncing" });
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const phaseTimer = setInterval(() => {
      setPhase((p) => Math.min(p + 1, PHASES.length - 1));
    }, 2200);

    fetch("/api/sync/gmail/run", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body.error === "token_expired"
              ? "Your Gmail connection expired before this finished. Reconnect to try again."
              : "The sync couldn't finish. You can try again from your Account page."
          );
        }
        router.push("/connect/gmail/done");
      })
      .catch((error: Error) => {
        setState({ status: "error", message: error.message });
      })
      .finally(() => clearInterval(phaseTimer));

    return () => clearInterval(phaseTimer);
  }, [router]);

  if (state.status === "error") {
    return (
      <div className="section stack">
        <p className="page__lede">{state.message}</p>
        <div className="row">
          <a href="/connect/gmail" className="btn btn-primary">
            Reconnect Gmail
          </a>
          <a href="/dashboard" className="btn-quiet">
            Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="section stack">
      <div className="sync-progress-track" aria-hidden="true">
        <div className="sync-progress-fill" />
      </div>
      <p className="page__lede" role="status" aria-live="polite">
        {PHASES[phase]}
      </p>
    </div>
  );
}
