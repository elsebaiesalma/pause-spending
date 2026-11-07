"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  TOUR_STEPS,
  TOUR_STOPS,
  parseTourState,
  placeTooltip,
  tourKey,
  type Rect,
  type Size,
  type TourStep,
} from "@/lib/demoTour";
import styles from "./DemoTour.module.css";

// Progress is saved in this browser, under the demo user's id. A new demo is a
// new user, so it starts the tour again, and nothing needs a database column.
// Browsers that block storage fall back to memory for the visit.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function readSaved(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function save(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Memory above is enough for this visit.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

// The first target that is actually on screen. The phone tab bar is hidden on a
// laptop, so a step can list both and light up whichever one exists.
function findTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.getBoundingClientRect().width > 0) return el;
  }
  return null;
}

function toRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

export function DemoTour({ userId }: { userId: string }) {
  const key = tourKey(userId);
  // The server never draws the tour ("done"); the browser decides after it loads.
  const raw = useSyncExternalStore(
    subscribe,
    () => readSaved(key),
    () => "done",
  );
  const state = parseTourState(raw);
  const pathname = usePathname();
  const router = useRouter();

  // "Take the tour" in the account menu links here to start it over.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("tour") !== "1") return;
    save(key, "0");
    router.replace(pathname);
  }, [key, pathname, router]);

  if (state.status === "done") return null;
  const step = TOUR_STEPS[state.step];
  // If the visitor wanders off the step's page, the tour waits for them there.
  if (!step.path.test(pathname)) return null;

  return <TourCard key={step.id} step={step} index={state.step} storageKey={key} />;
}

function TourCard({ step, index, storageKey }: { step: TourStep; index: number; storageKey: string }) {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<Size>({ w: 0, h: 0 });
  const [card, setCard] = useState<Size>({ w: 0, h: 0 });
  const [measured, setMeasured] = useState(false);
  // A page can take a moment to arrive. Until the target shows up the box stays
  // hidden, and after this long it settles in the middle instead.
  const [gaveUp, setGaveUp] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = findTarget(step.targets);
        setTarget(el ? toRect(el) : null);
        setViewport({ w: window.innerWidth, h: window.innerHeight });
        setCard({ w: cardRef.current?.offsetWidth ?? 0, h: cardRef.current?.offsetHeight ?? 0 });
        setMeasured(true);
      });
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    findTarget(step.targets)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });

    measure();
    // The smooth scroll and any late-arriving page content both move things.
    const timers = [100, 400, 900].map((ms) => window.setTimeout(measure, ms));
    const giveUp = window.setTimeout(() => setGaveUp(true), 1500);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { capture: true, passive: true });
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
      window.clearTimeout(giveUp);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, { capture: true });
      observer.disconnect();
    };
  }, [step.targets]);

  const finish = () => save(storageKey, "done");

  useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") save(storageKey, "done");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [storageKey]);

  function goNext() {
    const { next } = step;
    if (next.kind === "finish") return finish();
    save(storageKey, String(index + 1));
    if (next.kind === "go") router.push(next.href);
    if (next.kind === "post") {
      setPending(true);
      // A real form post, like "Try a sample item" on Home: it makes the item
      // and lands on its pause screen.
      const form = document.createElement("form");
      form.method = "POST";
      form.action = next.action;
      document.body.appendChild(form);
      form.submit();
    }
  }

  function goBack() {
    const previous = TOUR_STEPS[index - 1];
    save(storageKey, String(index - 1));
    // Steps on another page return there by going back, which also covers the
    // pause screen, whose address depends on the sample item.
    if (previous.page !== step.page) router.back();
  }

  const hasTargets = step.targets.length > 0;
  const waiting = hasTargets && !target && !gaveUp;
  const layout = placeTooltip(hasTargets ? target : null, viewport, card);
  const hole = layout.hole;
  const stop = index; // the welcome card is stop 0, so the first real stop is 1

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <svg className={styles.dim} aria-hidden="true" focusable="false">
        <defs>
          <mask id="tour-dim-mask">
            <rect width="100%" height="100%" fill="white" />
            {hole && (
              <rect
                x={hole.left}
                y={hole.top}
                width={hole.right - hole.left}
                height={hole.bottom - hole.top}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" className={styles.dimFill} mask="url(#tour-dim-mask)" />
      </svg>
      {hole && (
        <div
          className={styles.ring}
          style={{
            left: hole.left,
            top: hole.top,
            width: hole.right - hole.left,
            height: hole.bottom - hole.top,
          }}
        />
      )}

      <div
        ref={cardRef}
        className={styles.card}
        style={{
          left: layout.left,
          top: layout.top,
          visibility: measured && !waiting ? "visible" : "hidden",
        }}
      >
        {layout.arrowLeft !== null && (
          <span
            className={`${styles.arrow} ${layout.placement === "below" ? styles.arrowUp : styles.arrowDown}`}
            style={{ left: layout.arrowLeft }}
            aria-hidden="true"
          />
        )}
        {stop > 0 && (
          <p className={styles.count}>
            {stop} of {TOUR_STOPS}
          </p>
        )}
        <h2 id="tour-title" className={styles.title}>
          {step.title}
        </h2>
        <p className={styles.body}>{step.body}</p>
        <div className={styles.actions}>
          <button type="button" className="btn-quiet" onClick={finish}>
            Skip tour
          </button>
          <div className={styles.buttons}>
            {index > 0 && (
              <button type="button" className="btn" onClick={goBack} disabled={pending}>
                Back
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              className="btn btn-primary"
              onClick={goNext}
              disabled={pending}
              aria-busy={pending}
            >
              {pending ? "Opening…" : step.nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
