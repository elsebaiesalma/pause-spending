"use client";

import { useEffect, useRef, useState } from "react";
import { URGE_MARKS } from "@/lib/landing/urgeCurve";
import styles from "./urgeTexts.module.css";

const TYPING_MS = 700;
const GAP_MS = 350;

// The phone version of the urge curve: four texts that arrive one by one, the
// way messages do, each quieter than the last. Same four moments and words as
// the chart, so the two never disagree.
//
// The finished thread is the default (server render, no script, reduced
// motion). When motion is allowed and the thread scrolls into view, it plays
// once: a typing indicator, then the bubble, then the next.
export function UrgeTexts() {
  const rootRef = useRef<HTMLElement>(null);
  // How many messages are shown, and whether the next one is "typing".
  // `null` = not animating, show everything.
  const [shown, setShown] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    // Hide the messages until the thread is on screen.
    setShown(0);
    const timers: number[] = [];
    const step = (count: number) => {
      if (count >= URGE_MARKS.length) {
        setTyping(false);
        setShown(null);
        return;
      }
      setTyping(true);
      timers.push(
        window.setTimeout(() => {
          setTyping(false);
          setShown(count + 1);
          timers.push(window.setTimeout(() => step(count + 1), GAP_MS));
        }, TYPING_MS)
      );
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          step(0);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(root);
    return () => {
      observer.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const visible = shown === null ? URGE_MARKS.length : shown;

  return (
    <figure className={styles.thread} ref={rootRef} data-playing={shown !== null || undefined}>
      <figcaption className={styles.caption}>Sound familiar?</figcaption>
      <ol className={styles.list}>
        {URGE_MARKS.map((mark, index) => (
          // Hidden ones keep their space, so the section never changes height.
          <li
            key={mark.hour}
            className={styles.item}
            data-step={index}
            data-shown={index < visible || undefined}
          >
            <span className={styles.hour}>{mark.hour}</span>
            <p className={styles.bubble}>{mark.thought}</p>
            {/* The three dots sit where the next message will land. */}
            {typing && index === visible && (
              <p className={styles.typing} aria-hidden="true">
                <span />
                <span />
                <span />
              </p>
            )}
          </li>
        ))}
      </ol>
    </figure>
  );
}
