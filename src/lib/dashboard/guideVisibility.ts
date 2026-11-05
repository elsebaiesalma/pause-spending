// "Get to know PAUSE" can be minimized to its title and progress bar. The
// choice lives in this browser only (account-level memory is parked), so every
// read and write is guarded: storage can be blocked, and then the guide simply
// stays open.
export const GUIDE_MINIMIZED_KEY = "pause.setupGuide.minimized";
const EVENT = "pause:guide-minimized";

export function isGuideMinimized(): boolean {
  try {
    return window.localStorage.getItem(GUIDE_MINIMIZED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuideMinimized(minimized: boolean): void {
  try {
    if (minimized) window.localStorage.setItem(GUIDE_MINIMIZED_KEY, "1");
    else window.localStorage.removeItem(GUIDE_MINIMIZED_KEY);
  } catch {
    // Not remembered; the change below still applies for this page view.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeGuideMinimized(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
