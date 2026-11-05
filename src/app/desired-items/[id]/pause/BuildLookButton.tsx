"use client";

import { useEffect } from "react";
import Link from "next/link";

const FIELD_NAMES = ["reflectionReplaces", "reflectionNeedScore", "reflectionReasonFor", "reflectionReasonAgainst"] as const;

type Stored = Record<string, string>;

function reflectionForm(): HTMLFormElement | null {
  return document.getElementById("reflection")?.closest("form") ?? null;
}

// Opens the board full screen and, when the board saves, returns here. The
// reflection questions on this page are only stored when an action button is
// pressed, so what has been typed so far is kept in sessionStorage across the
// trip and put back on return. Nothing leaves the browser.
export function BuildLookButton({ itemId }: { itemId: string }) {
  const storageKey = `pause-reflection:${itemId}`;

  useEffect(() => {
    let stored: Stored | null = null;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      stored = raw ? (JSON.parse(raw) as Stored) : null;
      window.sessionStorage.removeItem(storageKey);
    } catch {
      return;
    }
    const form = reflectionForm();
    if (!stored || !form) return;

    for (const name of FIELD_NAMES) {
      const value = stored[name];
      if (!value) continue;
      const fields = form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`);
      for (const field of fields) {
        if (field.type === "radio") field.checked = field.value === value;
        else if (!field.value) field.value = value;
      }
    }
  }, [storageKey]);

  function remember() {
    const form = reflectionForm();
    if (!form) return;
    const data = new FormData(form);
    const snapshot: Stored = {};
    for (const name of FIELD_NAMES) {
      const value = data.get(name)?.toString();
      if (value) snapshot[name] = value;
    }
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // Storage unavailable: the board still works, the fields just start fresh.
    }
  }

  const returnTo = `/desired-items/${itemId}/pause#reflection`;
  return (
    <Link
      href={`/lookbook/board?for=${itemId}&returnTo=${encodeURIComponent(returnTo)}`}
      className="btn action"
      onClick={remember}
    >
      Style what you already own
    </Link>
  );
}
