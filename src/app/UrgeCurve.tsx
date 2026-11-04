"use client";

import { useEffect, useRef } from "react";
import {
  CURVE_BASELINE,
  CURVE_HEIGHT,
  CURVE_WIDTH,
  URGE_MARKS,
  curvePath,
  curvePoint,
  litMarks,
} from "@/lib/landing/urgeCurve";
import styles from "./urgeCurve.module.css";

const PATH = curvePath();
const END = curvePoint(1);

// "The urge is loud. Then it fades." A line that draws itself as you scroll
// the section into view, with a dot riding the end and the four hour labels
// lighting up as it passes them. Everything moves by editing DOM attributes
// from a scroll handler, not React state, so scrolling never re-renders.
//
// The page renders the finished chart by default: with reduced motion, with
// no JavaScript, and before hydration. Motion only starts when the visitor
// allows it.
export function UrgeCurve() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!root || !path || !dot) return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = root.getBoundingClientRect();
      // The whole chart, its axes and its hour labels, is on screen for the
      // entire draw: it starts as the chart's top reaches 80% of the way down
      // and finishes once its bottom has risen to 85%, so the last label is
      // visible when the dot lands on it.
      const vh = window.innerHeight;
      const start = vh * 0.8;
      const endTop = vh * 0.85 - rect.height;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / Math.max(1, start - endTop)));
      path.style.strokeDashoffset = String(length * (1 - progress));
      const point = path.getPointAtLength(length * progress);
      dot.setAttribute("cx", point.x.toFixed(1));
      dot.setAttribute("cy", point.y.toFixed(1));
      const lit = String(litMarks(progress));
      if (root.dataset.lit !== lit) root.dataset.lit = lit;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
    };
  }, []);

  return (
    <figure className={styles.chart} ref={rootRef} data-lit={URGE_MARKS.length}>
      <figcaption className={styles.axisLabel}>An illustration of the finding, not plotted data</figcaption>
      <div className={styles.plot}>
        <div className={styles.yAxis} aria-hidden="true">
          <span>High</span>
          <span className={styles.yTitle}>Urge to buy</span>
          <span>Low</span>
        </div>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${CURVE_WIDTH} ${CURVE_HEIGHT}`}
          aria-hidden="true"
          focusable="false"
        >
          <line x1="0" x2={CURVE_WIDTH} y1={CURVE_BASELINE} y2={CURVE_BASELINE} className={styles.axis} />
          <path ref={pathRef} d={PATH} className={styles.line} />
          <circle ref={dotRef} cx={END.x - 8} cy={END.y} r="9" className={styles.dot} />
        </svg>
      </div>
      <ol className={styles.marks}>
        {URGE_MARKS.map((mark, index) => (
          <li key={mark.hour} className={styles.mark} data-index={index}>
            <span className={styles.hour}>{mark.hour}</span>
            <span className={styles.thought}>&ldquo;{mark.thought}&rdquo;</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
