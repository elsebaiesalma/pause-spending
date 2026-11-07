import { describe, expect, it } from "vitest";
import { TOUR_STEPS, TOUR_STOPS, parseTourState, placeTooltip, tourKey } from "./demoTour";

const VIEWPORT = { w: 390, h: 800 };
const CARD = { w: 300, h: 200 };

describe("tour steps", () => {
  it("starts with a welcome card that points at nothing", () => {
    expect(TOUR_STEPS[0].id).toBe("welcome");
    expect(TOUR_STEPS[0].targets).toEqual([]);
    expect(TOUR_STOPS).toBe(TOUR_STEPS.length - 1);
  });

  it("has unique ids and ends by finishing", () => {
    const ids = TOUR_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TOUR_STEPS[TOUR_STEPS.length - 1].next.kind).toBe("finish");
  });

  it("only changes page through a go or post step", () => {
    TOUR_STEPS.forEach((step, i) => {
      const following = TOUR_STEPS[i + 1];
      if (!following) return;
      if (following.page !== step.page) expect(["go", "post"]).toContain(step.next.kind);
      else expect(step.next.kind).toBe("stay");
    });
  });

  it("sends go steps to the page the next step lives on", () => {
    TOUR_STEPS.forEach((step, i) => {
      if (step.next.kind !== "go") return;
      expect(TOUR_STEPS[i + 1].path.test(step.next.href)).toBe(true);
    });
  });

  it("ends on the looks page, which is where outfits are built", () => {
    const last = TOUR_STEPS[TOUR_STEPS.length - 1];
    expect(last.id).toBe("looks");
    expect(last.path.test("/lookbook")).toBe(true);
    expect(last.path.test("/lookbook/board")).toBe(false);
  });

  it("matches the real pause screen address but not other pages", () => {
    const pause = TOUR_STEPS.find((s) => s.id === "compare")!;
    expect(pause.path.test("/desired-items/abc123/pause")).toBe(true);
    expect(pause.path.test("/desired-items/abc123/confirm")).toBe(false);
    expect(pause.path.test("/desired-items/new")).toBe(false);
  });
});

describe("saved progress", () => {
  it("keys progress by user so a new demo starts again", () => {
    expect(tourKey("a")).not.toBe(tourKey("b"));
  });

  it("starts when nothing is saved", () => {
    expect(parseTourState(null)).toEqual({ status: "active", step: 0 });
  });

  it("reads done and a saved step", () => {
    expect(parseTourState("done")).toEqual({ status: "done" });
    expect(parseTourState("3")).toEqual({ status: "active", step: 3 });
  });

  it("starts over on a value it does not understand", () => {
    expect(parseTourState("banana")).toEqual({ status: "active", step: 0 });
    expect(parseTourState(String(TOUR_STEPS.length))).toEqual({ status: "active", step: 0 });
    expect(parseTourState("-1")).toEqual({ status: "active", step: 0 });
  });
});

describe("placeTooltip", () => {
  it("centres the box when nothing is lit", () => {
    const layout = placeTooltip(null, VIEWPORT, CARD);
    expect(layout.placement).toBe("center");
    expect(layout.hole).toBeNull();
    expect(layout.arrowLeft).toBeNull();
    expect(layout.left).toBe(45);
    expect(layout.top).toBe(300);
  });

  it("goes below a target near the top and points up at it", () => {
    const layout = placeTooltip({ left: 20, top: 100, right: 370, bottom: 200 }, VIEWPORT, CARD);
    expect(layout.placement).toBe("below");
    expect(layout.top).toBe(208 + 12);
    expect(layout.arrowLeft).not.toBeNull();
  });

  it("goes above a target near the bottom, like the phone tab bar", () => {
    const layout = placeTooltip({ left: 160, top: 740, right: 230, bottom: 790 }, VIEWPORT, CARD);
    expect(layout.placement).toBe("above");
    expect(layout.top + CARD.h).toBeLessThan(layout.hole!.top);
  });

  it("keeps the box on screen and the arrow on the box", () => {
    const layout = placeTooltip({ left: 0, top: 100, right: 40, bottom: 140 }, VIEWPORT, CARD);
    expect(layout.left).toBeGreaterThanOrEqual(16);
    expect(layout.arrowLeft).toBeGreaterThanOrEqual(24);
    const right = placeTooltip({ left: 350, top: 100, right: 390, bottom: 140 }, VIEWPORT, CARD);
    expect(right.left + CARD.w).toBeLessThanOrEqual(VIEWPORT.w - 16);
    expect(right.arrowLeft).toBeLessThanOrEqual(CARD.w - 24);
  });

  it("pins the box to the bottom and shortens the lit area for a target taller than the screen", () => {
    const layout = placeTooltip({ left: 20, top: 60, right: 370, bottom: 1400 }, VIEWPORT, CARD);
    expect(layout.placement).toBe("pinned");
    expect(layout.arrowLeft).toBeNull();
    expect(layout.top + CARD.h).toBe(VIEWPORT.h - 16);
    expect(layout.hole!.bottom).toBeLessThanOrEqual(layout.top - 12);
  });

  it("never lets the box be wider than the screen", () => {
    const layout = placeTooltip(null, { w: 320, h: 600 }, { w: 400, h: 200 });
    expect(layout.left).toBeGreaterThanOrEqual(16);
  });

  it("never returns a negative lit area when the target is scrolled off screen", () => {
    const above = placeTooltip({ left: 20, top: -400, right: 370, bottom: -200 }, VIEWPORT, CARD);
    expect(above.hole!.bottom).toBeGreaterThanOrEqual(above.hole!.top);
    const below = placeTooltip({ left: 20, top: 900, right: 370, bottom: 1100 }, VIEWPORT, CARD);
    expect(below.hole!.bottom).toBeGreaterThanOrEqual(below.hole!.top);
    expect(below.hole!.right).toBeGreaterThanOrEqual(below.hole!.left);
  });
});
