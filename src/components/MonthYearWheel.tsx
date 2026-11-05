"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import styles from "./monthYearWheel.module.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ROW_REM = 2.5;

type Column = { label: string; items: string[]; index: number | null; onPick: (index: number) => void };

// One scrolling column that snaps its centre row under the highlight band: drag
// or scroll it, click a row, or use the arrow keys.
function Wheel({ label, items, index, onPick }: Column) {
  const listRef = useRef<HTMLUListElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const touched = useRef(false);
  const id = useId();

  // Keep the list scrolled to the chosen row when the value changes from
  // outside the wheel (Clear, or the other wheel setting a default).
  useEffect(() => {
    const list = listRef.current;
    if (!list || index === null || touched.current) return;
    const rowPx = parseFloat(getComputedStyle(list).fontSize) * ROW_REM;
    list.scrollTop = index * rowPx;
  }, [index]);

  function rowPx() {
    const list = listRef.current;
    return list ? parseFloat(getComputedStyle(list).fontSize) * ROW_REM : 40;
  }

  function onScroll() {
    touched.current = true;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const list = listRef.current;
      if (!list) return;
      const next = Math.min(items.length - 1, Math.max(0, Math.round(list.scrollTop / rowPx())));
      if (next !== index) onPick(next);
      touched.current = false;
    }, 120);
  }

  function move(next: number) {
    const clamped = Math.min(items.length - 1, Math.max(0, next));
    touched.current = false;
    listRef.current?.scrollTo({ top: clamped * rowPx(), behavior: "smooth" });
    onPick(clamped);
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const current = index ?? 0;
    if (event.key === "ArrowDown") move(current + 1);
    else if (event.key === "ArrowUp") move(current - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(items.length - 1);
    else return;
    event.preventDefault();
  }

  return (
    <div className={styles.col}>
      <span className={styles.colLabel} id={`${id}-label`}>
        {label}
      </span>
      <ul
        ref={listRef}
        className={styles.list}
        role="listbox"
        tabIndex={0}
        aria-labelledby={`${id}-label`}
        aria-activedescendant={index === null ? undefined : `${id}-${index}`}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
      >
        {items.map((item, i) => (
          <li
            key={item}
            id={`${id}-${i}`}
            role="option"
            aria-selected={index === i}
            className={styles.row}
            onClick={() => move(i)}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function parts(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) - 1 } : null;
}

// Owned since as a month and a year, scrolled like a phone's date picker. The
// closet only ever shows "Mar 2026", so there is no day. Touching either wheel
// sets both (the other one at the row it is showing). A date that already has a
// day keeps it until the month or year is changed.
export function MonthYearWheel({
  value,
  onChange,
  name,
  years,
}: {
  value: string;
  onChange: (next: string) => void;
  // Left out when the caller keeps its own hidden input (a wheel that mounts
  // only while it is open).
  name?: string;
  years: number[];
}) {
  const current = parts(value);
  const yearItems = years.map(String);
  const yearIndex = current ? years.indexOf(current.year) : null;
  const originalDay = useRef(value);

  function emit(year: number, month: number) {
    const original = parts(originalDay.current);
    if (original && original.year === year && original.month === month) return onChange(originalDay.current);
    onChange(`${year}-${String(month + 1).padStart(2, "0")}-01`);
  }

  const defaultYear = years[0];
  const defaultMonth = new Date().getMonth();

  return (
    <div className={styles.wheel}>
      <div className={styles.picked} aria-live="polite">
        {/* The field above already shows the month; this row only clears it. */}
        {current && (
          <button type="button" className="btn-quiet" onClick={() => onChange("")}>
            Clear
          </button>
        )}
      </div>
      <div className={styles.columns} data-unset={!current || undefined}>
        <span className={styles.band} aria-hidden="true" />
        <Wheel
          label="Month"
          items={MONTHS}
          index={current ? current.month : null}
          onPick={(month) => emit(current?.year ?? defaultYear, month)}
        />
        <Wheel
          label="Year"
          items={yearItems}
          index={yearIndex === null || yearIndex < 0 ? null : yearIndex}
          onPick={(i) => emit(years[i], current?.month ?? defaultMonth)}
        />
      </div>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
