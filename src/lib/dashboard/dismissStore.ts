// Remembers a dismissal per key in localStorage, readable through
// useSyncExternalStore (no setState in an effect). Storage can be missing or
// throw (private windows, blocked site data), so every access is wrapped and
// an in-memory set keeps the card dismissed for this visit either way. When
// storage is unavailable the card simply shows again next visit - never hidden
// by accident.

const memory = new Set<string>();
const listeners = new Set<() => void>();

export function dismissKey(monthKey: string): string {
  return `pause:recap-dismissed:${monthKey}`;
}

export function isDismissed(key: string): boolean {
  if (memory.has(key)) return true;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function dismiss(key: string): void {
  memory.add(key);
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Kept in memory for this visit only.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeDismissals(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

// Test helper: forget the in-memory dismissals.
export function resetDismissalMemory(): void {
  memory.clear();
}
