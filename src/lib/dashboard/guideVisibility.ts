// "Get to know PAUSE" can be closed. The choice lives in this browser only
// (account-level memory is parked), so every read and write is guarded: storage
// can be blocked, and then the guide simply stays visible.
export const GUIDE_HIDDEN_KEY = "pause.setupGuide.hidden";
const EVENT = "pause:guide-visibility";

export function isGuideHidden(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuideHidden(hidden: boolean): void {
  try {
    if (hidden) window.localStorage.setItem(GUIDE_HIDDEN_KEY, "1");
    else window.localStorage.removeItem(GUIDE_HIDDEN_KEY);
  } catch {
    // Not remembered; the change below still applies for this page view.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeGuideVisibility(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
