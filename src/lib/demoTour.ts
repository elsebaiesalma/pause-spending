// The guided tour a first-time demo visitor sees: a dimmed page, one real part
// of the app lit up, and a small box with an arrow that says what it is. The
// steps, the placement maths and the saved progress live here, away from React,
// so they can be tested on their own (src/components/DemoTour.tsx draws it).

// Which screen a step belongs to. Moving between steps on the same page is a
// plain state change; moving to another page navigates.
export type TourPage = "home" | "pause" | "decisions" | "closet";

export type TourNext =
  | { kind: "stay" }
  | { kind: "go"; href: string }
  // The sample item is created by a POST that redirects to its pause screen.
  | { kind: "post"; action: string }
  | { kind: "finish" };

export type TourStep = {
  id: string;
  page: TourPage;
  path: RegExp;
  // Elements to light up (data-tour attributes). The first one that is on
  // screen wins, so the phone tab bar and the laptop add box can share a step.
  // No match, or no targets, centres the box instead.
  targets: string[];
  title: string;
  body: string;
  nextLabel: string;
  next: TourNext;
};

const HOME = /^\/dashboard\/?$/;

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    page: "home",
    path: HOME,
    targets: [],
    title: "Welcome to PAUSE",
    body: "PAUSE gives you a moment to think before you buy clothes. This short tour walks through a sample closet. Nothing here is real.",
    nextLabel: "Start the tour",
    next: { kind: "stay" },
  },
  {
    id: "month",
    page: "home",
    path: HOME,
    targets: ['[data-tour="money"]'],
    title: "Your month",
    body: "Your monthly plan and savings goal live here. Every item you let go adds its price to your goal.",
    nextLabel: "Next",
    next: { kind: "stay" },
  },
  {
    id: "add",
    page: "home",
    path: HOME,
    targets: ['[data-tour="pause-tab"]', '[data-tour="add"]'],
    title: "Start here",
    body: "Add anything you're thinking of buying. Next, we'll add a sample item so you can see what happens.",
    nextLabel: "Add a sample item",
    next: { kind: "post", action: "/api/demo/sample-item" },
  },
  {
    id: "compare",
    page: "pause",
    path: /^\/desired-items\/[^/]+\/pause\/?$/,
    targets: ['[data-tour="compare"]'],
    title: "What you want, next to what you own",
    body: "PAUSE finds the closest piece already in your closet and shows which details match. Sometimes that's enough to change your mind.",
    nextLabel: "Next",
    next: { kind: "stay" },
  },
  {
    id: "reflection",
    page: "pause",
    path: /^\/desired-items\/[^/]+\/pause\/?$/,
    targets: ['[data-tour="reflection"]'],
    title: "A moment to think",
    body: "Three short questions, then the cost against your plan. After that you choose: pause for 24 hours, pause for 7 days, decide later, let it go or buy anyway.",
    nextLabel: "Next",
    next: { kind: "go", href: "/considering" },
  },
  {
    id: "decisions",
    page: "decisions",
    path: /^\/considering\/?$/,
    targets: ['[data-tour="decisions-tabs"]'],
    title: "Your decisions",
    body: "Everything you add ends up here. When a pause runs out, the item quietly moves to Undecided. There are no reminders.",
    nextLabel: "Next",
    next: { kind: "go", href: "/wardrobe" },
  },
  {
    id: "closet",
    page: "closet",
    path: /^\/wardrobe\/?$/,
    targets: ['[data-tour="closet-tabs"]'],
    title: "Your closet",
    body: "Everything you own, as a grid or a rack, plus outfits you build from it. PAUSE uses it to find what you already have.",
    nextLabel: "Done",
    next: { kind: "finish" },
  },
];

// The welcome card is not counted, so the first real stop reads "1 of 6".
export const TOUR_STOPS = TOUR_STEPS.length - 1;

export function tourKey(userId: string): string {
  return `pause-tour:${userId}`;
}

export type TourState = { status: "active"; step: number } | { status: "done" };

// What is saved: nothing (never started, so the tour begins), "done", or the
// number of the step the visitor is on. A new demo is a new user id, so it
// always starts fresh.
export function parseTourState(raw: string | null): TourState {
  if (raw === null) return { status: "active", step: 0 };
  if (raw === "done") return { status: "done" };
  const step = Number(raw);
  if (Number.isInteger(step) && step >= 0 && step < TOUR_STEPS.length) return { status: "active", step };
  return { status: "active", step: 0 };
}

export type Rect = { left: number; top: number; right: number; bottom: number };
export type Size = { w: number; h: number };

export type Placement = "center" | "below" | "above" | "pinned";

export type TourLayout = {
  placement: Placement;
  left: number;
  top: number;
  // Where the arrow sits along the box, from its left edge. Null when the box
  // is not pointing at anything.
  arrowLeft: number | null;
  // The lit-up area, with a little breathing room. Null when nothing is lit.
  hole: Rect | null;
};

const MARGIN = 16;
const GAP = 12;
const PAD = 8;
const ARROW_INSET = 24;

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), Math.max(min, max));
}

// Puts the box below the target when it fits, otherwise above. When neither
// fits (a target taller than the screen), the box is pinned to the bottom edge
// and the lit area is shortened so the box never covers it.
export function placeTooltip(target: Rect | null, viewport: Size, card: Size): TourLayout {
  const width = Math.min(card.w, viewport.w - MARGIN * 2);

  if (!target) {
    return {
      placement: "center",
      left: Math.max(MARGIN, (viewport.w - width) / 2),
      top: Math.max(MARGIN, (viewport.h - card.h) / 2),
      arrowLeft: null,
      hole: null,
    };
  }

  // Clamped on every side: while the page is still scrolling, the target can be
  // briefly off screen, and a negative size is not a valid rectangle.
  const holeLeft = clamp(target.left - PAD, 0, viewport.w);
  const holeTop = clamp(target.top - PAD, 0, viewport.h);
  const hole: Rect = {
    left: holeLeft,
    top: holeTop,
    right: Math.max(holeLeft, Math.min(target.right + PAD, viewport.w)),
    bottom: Math.max(holeTop, Math.min(target.bottom + PAD, viewport.h)),
  };
  const left = clamp(
    (hole.left + hole.right) / 2 - width / 2,
    MARGIN,
    viewport.w - width - MARGIN,
  );
  const center = (hole.left + hole.right) / 2;
  const arrowLeft = clamp(center - left, ARROW_INSET, width - ARROW_INSET);

  const below = viewport.h - hole.bottom - GAP - MARGIN;
  const above = hole.top - GAP - MARGIN;

  if (below >= card.h) {
    return { placement: "below", left, top: hole.bottom + GAP, arrowLeft, hole };
  }
  if (above >= card.h) {
    return { placement: "above", left, top: hole.top - GAP - card.h, arrowLeft, hole };
  }
  const top = viewport.h - MARGIN - card.h;
  return {
    placement: "pinned",
    left,
    top,
    arrowLeft: null,
    hole: { ...hole, bottom: Math.max(hole.top + 40, Math.min(hole.bottom, top - GAP)) },
  };
}
