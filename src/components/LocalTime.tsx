"use client";

import { useSyncExternalStore } from "react";
import { formatUnlockTime } from "@/lib/dashboard/unlockTime";

// Times are formatted in the viewer's browser, not on the server: the server
// runs in UTC, so 11:35 pm in Toronto came out as "4:35am". The server render
// (and the first paint while hydrating) shows nothing rather than a wrong time.
function subscribe() {
  return () => {};
}

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function LocalTime({ iso, kind }: { iso: string; kind: "unlock" | "date" }) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  if (!inBrowser) return null;
  const date = new Date(iso);
  return <>{kind === "unlock" ? formatUnlockTime(date) : DATE_FORMAT.format(date)}</>;
}
