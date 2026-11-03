"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void): () => void {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
}

// Reads one query parameter on the client without an effect. The server
// snapshot is null, so the first paint matches the server and the value
// appears once hydrated (the same pattern as ActionToast).
export function useQueryParam(name: string): string | null {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => ""
  );
  return new URLSearchParams(search).get(name);
}
