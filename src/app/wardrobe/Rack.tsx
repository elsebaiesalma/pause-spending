"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { RACK, VIRTUALIZE_AFTER, layoutRack, visibleEntries, type WardrobeEntry } from "@/lib/wardrobeView";
import { ItemImage, ItemMenu } from "./WardrobeParts";
import cardStyles from "./page.module.css";
import styles from "./rack.module.css";

export type ScrollTarget = { key: string; nonce: number };

const SWAY_MAX_DEG = 4;
const SWAY_PER_PX = 0.14;
const SWAY_SETTLE_MS = 120;
const DRAG_THRESHOLD_PX = 5;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// A line-art hanger, drawn here. The hook's apex sits on the rail and the
// whole thing pivots from that point (see .swing in rack.module.css).
function Hanger() {
  return (
    <svg className={styles.hanger} viewBox="0 0 72 40" width="72" height="40" aria-hidden="true" focusable="false">
      <path
        d="M36 40 L36 20 M36 20 C36 14 42 13 42 8 C42 3.5 38.5 1.5 35.5 1.5 C32.5 1.5 30.5 3.5 30.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M36 20 L4 33 Q2 34 4 35.5 L68 35.5 Q70 34 68 33 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Clip() {
  return (
    <svg className={styles.clip} viewBox="0 0 28 18" width="28" height="18" aria-hidden="true" focusable="false">
      <rect x="9" y="1" width="10" height="16" rx="2" fill="var(--color-bg)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6 H16 M12 10 H16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function RackCard({ item, menu = true }: { item: WardrobeEntry; menu?: boolean }) {
  return (
    <div className={styles.card}>
      <a href={`/wardrobe/${item.id}/edit`} className={cardStyles.cardLink} aria-label={`Edit ${item.displayName}`} />
      <div className={styles.cardImage}>
        <ItemImage item={item} sizes={`${RACK.cardW}px`} />
        {item.needsReview && <span className={`badge-review ${cardStyles.reviewBadge} ${styles.badgeBottom}`}>Needs review</span>}
      </div>
      {menu && <ItemMenu item={item} />}
    </div>
  );
}

// One hanging piece: hanger, clip, card and tag, pivoting from the hook. Used
// by the Rack and by Home's short rail, so both look and sway the same.
export function HangingPiece({ item, menu = true }: { item: WardrobeEntry; menu?: boolean }) {
  return (
    <div className={styles.swing}>
      <Hanger />
      <Clip />
      <RackCard item={item} menu={menu} />
      <RackTag item={item} />
    </div>
  );
}

function RackTag({ item }: { item: WardrobeEntry }) {
  return (
    <div className={styles.tag}>
      {/* The brand row is always there (empty when unknown), so names and
          prices line up across the rail. */}
      <p className={styles.tagBrand}>{item.brand ?? ""}</p>
      <p className={styles.tagName}>{item.displayName}</p>
      <p className={item.price === null ? styles.tagPriceMissing : styles.tagPrice}>
        {item.price !== null ? `$${item.price.toFixed(0)}` : "Price not set"}
      </p>
    </div>
  );
}

export function Rack({
  items,
  scrollTarget,
  wellStocked = [],
}: {
  items: WardrobeEntry[];
  scrollTarget: ScrollTarget | null;
  wellStocked?: string[];
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const lastLeftRef = useRef(0);
  const settleTimerRef = useRef<number | undefined>(undefined);
  const jumpTimerRef = useRef<number | undefined>(undefined);
  const dragRef = useRef<{ startX: number; startLeft: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  // Generous default so the first (server) render isn't empty; the observer
  // below replaces it with the real width.
  const [viewport, setViewport] = useState({ left: 0, width: 1200 });
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const layout = useMemo(() => layoutRack(items, new Set(wellStocked)), [items, wellStocked]);
  const virtualized = layout.itemCount > VIRTUALIZE_AFTER;
  const shown = useMemo(
    () => (virtualized ? visibleEntries(layout.entries, viewport.left, viewport.width, viewport.width) : layout.entries),
    [virtualized, layout.entries, viewport.left, viewport.width]
  );

  const syncEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    setViewport((prev) =>
      prev.left === el.scrollLeft && prev.width === el.clientWidth ? prev : { left: el.scrollLeft, width: el.clientWidth }
    );
  };

  // The ResizeObserver reports the initial size as soon as it starts
  // observing, and again whenever the rack is resized or its width changes.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setViewport((prev) => (prev.width === el.clientWidth ? prev : { left: el.scrollLeft, width: el.clientWidth }));
      setAtStart(el.scrollLeft <= 1);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameRef.current);
      window.clearTimeout(settleTimerRef.current);
      window.clearTimeout(jumpTimerRef.current);
    };
  }, []);

  const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");

  // Chip jumps can cross most of a long rack. Snapping is switched off for
  // the trip, and far jumps are instant: with a virtualized track the snap
  // points near the destination are not in the DOM yet, so a smooth scroll
  // under mandatory snapping stalls halfway.
  const scrollToTarget = useEffectEvent((key: string) => {
    const el = scrollerRef.current;
    if (!el) return;
    const section = layout.sections.find((s) => s.key === key);
    const left = key === "start" ? 0 : section ? Math.max(0, section.x - RACK.pad) : null;
    if (left === null) return;

    const far = Math.abs(left - el.scrollLeft) > el.clientWidth * 2;
    el.dataset.jumping = "true";
    const done = () => {
      window.clearTimeout(jumpTimerRef.current);
      delete el.dataset.jumping;
    };
    // A far jump reports scrollend at once, before React has mounted the
    // items around the destination, so it waits out a timer instead.
    if (!far) el.addEventListener("scrollend", done, { once: true });
    jumpTimerRef.current = window.setTimeout(done, far ? 400 : 900);
    el.scrollTo({ left, behavior: far ? "auto" : scrollBehavior() });
  });

  useEffect(() => {
    if (scrollTarget) scrollToTarget(scrollTarget.key);
  }, [scrollTarget]);

  // Hanging cards lag the scroll a few degrees and swing back when it stops.
  // Done with one CSS variable on the scroller so React never re-renders for it.
  const onScroll = () => {
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = 0;
      const el = scrollerRef.current;
      if (!el) return;
      const velocity = el.scrollLeft - lastLeftRef.current;
      lastLeftRef.current = el.scrollLeft;
      syncEdges();

      if (prefersReducedMotion()) return;
      const sway = Math.max(-SWAY_MAX_DEG, Math.min(SWAY_MAX_DEG, -velocity * SWAY_PER_PX));
      el.style.setProperty("--sway", `${sway}deg`);
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => el.style.setProperty("--sway", "0deg"), SWAY_SETTLE_MS);
    });
  };

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: scrollBehavior() });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || event.altKey || event.ctrlKey || event.metaKey) return;
    // Leave arrow keys alone inside the ⋯ menu's controls.
    if ((event.target as HTMLElement).closest("button, summary")) return;
    const step = RACK.cardW + RACK.gap;
    if (event.key === "ArrowRight") el.scrollBy({ left: step, behavior: scrollBehavior() });
    else if (event.key === "ArrowLeft") el.scrollBy({ left: -step, behavior: scrollBehavior() });
    else if (event.key === "Home") el.scrollTo({ left: 0, behavior: scrollBehavior() });
    else if (event.key === "End") el.scrollTo({ left: el.scrollWidth, behavior: scrollBehavior() });
    else return;
    event.preventDefault();
  };

  // Mouse drag. Touch and pen already scroll natively (with snapping).
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el || event.pointerType !== "mouse" || event.button !== 0) return;
    dragRef.current = { startX: event.clientX, startLeft: el.scrollLeft, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      el.setPointerCapture(event.pointerId);
      el.dataset.dragging = "true";
    }
    if (drag.moved) el.scrollLeft = drag.startLeft - dx;
  };

  const endDrag = () => {
    const el = scrollerRef.current;
    if (dragRef.current?.moved) {
      // The click that follows a drag must not open the card under the cursor.
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    dragRef.current = null;
    if (el) delete el.dataset.dragging;
  };

  return (
    <section className={styles.rackSection} aria-label="Rack view">
      <div className={styles.controls}>
        <p className={styles.hint}>
          <span className={styles.hintTouch}>Swipe to scroll through your closet</span>
          <span className={styles.hintMouse}>Scroll, drag or use the arrows</span>
        </p>
        <div className={styles.arrows}>
          <button type="button" className={styles.arrow} onClick={() => scrollByPage(-1)} disabled={atStart} aria-label="Scroll rack left">
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className={styles.arrow} onClick={() => scrollByPage(1)} disabled={atEnd} aria-label="Scroll rack right">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className={styles.scroller}
        tabIndex={0}
        role="region"
        aria-label="Wardrobe rack. Use the left and right arrow keys to scroll."
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <ul
          className={styles.track}
          role="list"
          aria-label={`${layout.itemCount} ${layout.itemCount === 1 ? "piece" : "pieces"} on the rack`}
          style={{ width: layout.width } as CSSProperties}
        >
          {shown.map((entry) => {
            if (entry.kind === "divider") {
              return (
                <li key={entry.key} className={styles.divider} style={{ left: entry.x }}>
                  <span className={styles.dividerTab} aria-hidden="true">
                    {entry.label}
                  </span>
                  {entry.wellStocked && (
                    <span className={styles.dividerTag} aria-hidden="true">
                      Well stocked
                    </span>
                  )}
                  <span className={styles.srOnly}>
                    {entry.label}, {entry.count} {entry.count === 1 ? "piece" : "pieces"}
                    {entry.wellStocked ? ", well stocked" : ""}
                  </span>
                </li>
              );
            }

            const ariaPosition = virtualized
              ? { "aria-posinset": entry.position, "aria-setsize": layout.itemCount }
              : undefined;

            return entry.hangs ? (
              <li key={entry.key} className={styles.hanging} style={{ left: entry.x }} {...ariaPosition}>
                <HangingPiece item={entry.item} />
              </li>
            ) : (
              <li key={entry.key} className={styles.standing} style={{ left: entry.x }} {...ariaPosition}>
                <RackCard item={entry.item} />
                <RackTag item={entry.item} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
