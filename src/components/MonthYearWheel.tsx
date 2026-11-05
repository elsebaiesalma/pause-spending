"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import styles from "./monthYearWheel.module.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ROW_REM = 2.5;

type Column = { label: string; items: string[]; index: number | null; onPick: (index: number) => void; loop?: boolean };

// One scrolling column that snaps its centre row under the highlight band: drag
// or scroll it, click a row, or use the arrow keys.
function Wheel({ label, items, index, onPick, loop = false }: Column) {
  const listRef = useRef<HTMLUListElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const touched = useRef(false);
  const id = useId();
  const n = items.length;
  // A looping wheel (months) shows three copies and re-centres on the middle
  // one, so December sits above January and the wheel never runs out.
  const rows = loop ? [...items, ...items, ...items] : items;
  const offset = loop ? n : 0;

  // Keep the list scrolled to the chosen row when the value changes from
  // outside the wheel (Clear, or the other wheel setting a default).
  useEffect(() => {
    const list = listRef.current;
    if (!list || touched.current) return;
    const rowPx = parseFloat(getComputedStyle(list).fontSize) * ROW_REM;
    // Unset: a looping wheel still starts in its middle copy.
    list.scrollTop = (offset + (index ?? 0)) * rowPx;
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
      let row = Math.min(rows.length - 1, Math.max(0, Math.round(list.scrollTop / rowPx())));
      if (loop && (row < n || row >= 2 * n)) {
        // Same month, one copy over: jump without the person seeing it.
        row = row < n ? row + n : row - n;
        list.scrollTop = row * rowPx();
      }
      const next = loop ? row - n : row;
      if (next !== index) onPick(next);
      touched.current = false;
    }, 120);
  }

  // `next` is a position in the shown rows (for a loop, in the middle copy
  // that is offset by one set of items).
  function move(next: number) {
    const clamped = Math.min(rows.length - 1, Math.max(0, next));
    touched.current = false;
    listRef.current?.scrollTo({ top: clamped * rowPx(), behavior: "smooth" });
    onPick(((clamped % n) + n) % n);
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const current = offset + (index ?? 0);
    if (event.key === "ArrowDown") move(current + 1);
    else if (event.key === "ArrowUp") move(current - 1);
    else if (event.key === "Home") move(offset);
    else if (event.key === "End") move(offset + n - 1);
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
        aria-activedescendant={index === null ? undefined : `${id}-${offset + index}`}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
      >
        {rows.map((item, i) => (
          <li
            key={`${item}-${i}`}
            id={`${id}-${i}`}
            role="option"
            aria-hidden={loop && (i < n || i >= 2 * n) ? true : undefined}
            aria-selected={index === i - offset}
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
      <div className={styles.columns} data-unset={!current || undefined}>
        <span className={styles.band} aria-hidden="true" />
        <Wheel
          label="Month"
          items={MONTHS}
          index={current ? current.month : null}
          loop
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
