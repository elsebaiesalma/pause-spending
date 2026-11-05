"use client";

import { useRef, useState } from "react";
import { COLOR_FAMILIES, lookupColorFamily } from "@/lib/colorFamily";
import { swatchFor } from "@/lib/colorSwatch";
import { capitalizeFirst } from "@/lib/wardrobeDisplay";
import styles from "./colorPicker.module.css";

export type ColorValue = { family: string; other: string };

function Dot({ family }: { family: string }) {
  const swatch = swatchFor(family);
  const background =
    swatch?.kind === "multi"
      ? `linear-gradient(135deg, ${swatch.a} 50%, ${swatch.b} 50%)`
      : swatch?.kind === "solid"
        ? swatch.hex
        : undefined;
  return <span className={styles.dot} data-none={!swatch || undefined} aria-hidden="true" style={{ background }} />;
}

// Colour as pills with a little swatch. Only the closet's most common colours
// show at first, then "Show more" for the rest, and "Other" for a colour that
// isn't in the list: the person types it (it shows on the card as typed) and it
// is filed under the closest family for matching, which they can change.
// The two values it posts are `colorFamily` and `colorName` (the typed word, only
// with Other).
export function ColorPicker({
  common,
  value,
  onChange,
}: {
  common: readonly string[];
  value: ColorValue;
  onChange: (next: ColorValue) => void;
}) {
  const [otherOpen, setOtherOpen] = useState(Boolean(value.other));
  const [expanded, setExpanded] = useState(false);
  // Set once the person picks "Counts as" themselves; typing then no longer overrides it.
  const manualFamily = useRef(false);

  const shown = expanded
    ? [...COLOR_FAMILIES]
    : Array.from(new Set([...common, ...(value.family && !otherOpen ? [value.family] : [])]));
  const hit = otherOpen ? lookupColorFamily(value.other) ?? lookupColorFamily(value.other.trim().split(/\s+/).slice(-1)[0]) : null;

  function pick(family: string) {
    setOtherOpen(false);
    onChange({ family, other: "" });
  }

  return (
    <fieldset className={styles.picker}>
      <legend>Colour</legend>
      <div className={styles.pills} role="radiogroup" aria-label="Colour">
        {shown.map((family) => (
          <label key={family} className={styles.pill}>
            <input
              type="radio"
              name="colorPick"
              checked={!otherOpen && value.family === family}
              onChange={() => pick(family)}
            />
            <Dot family={family} />
            <span>{capitalizeFirst(family)}</span>
          </label>
        ))}
        {expanded && (
          <label className={styles.pill}>
            <input type="radio" name="colorPick" checked={!otherOpen && value.family === ""} onChange={() => pick("")} />
            <Dot family="" />
            <span>Not sure</span>
          </label>
        )}
        <label className={styles.pill}>
          <input
            type="radio"
            name="colorPick"
            checked={otherOpen}
            onChange={() => {
              setOtherOpen(true);
              manualFamily.current = false;
              onChange({ family: hit ?? "", other: value.other });
            }}
          />
          <span className={styles.otherMark} aria-hidden="true">+</span>
          <span>Other</span>
        </label>
        <button type="button" className="btn-quiet" aria-expanded={expanded} onClick={() => setExpanded((open) => !open)}>
          {expanded ? "Show fewer" : "Show more"}
        </button>
      </div>

      {otherOpen && (
        <div className={styles.other}>
          <label htmlFor="color-other">Your colour</label>
          <input
            id="color-other"
            value={value.other}
            maxLength={40}
            placeholder="e.g. Burgundy"
            autoComplete="off"
            onChange={(event) => {
              const text = event.target.value;
              const found = lookupColorFamily(text) ?? lookupColorFamily(text.trim().split(/\s+/).slice(-1)[0]);
              onChange({ family: manualFamily.current ? value.family : (found ?? ""), other: text });
            }}
          />
          <label htmlFor="color-counts-as">Counts as</label>
          <select
            id="color-counts-as"
            value={value.family}
            onChange={(event) => {
              manualFamily.current = true;
              onChange({ family: event.target.value, other: value.other });
            }}
          >
            <option value="">Closest match (we&apos;ll pick when you save)</option>
            {COLOR_FAMILIES.map((family) => (
              <option key={family} value={family}>
                {capitalizeFirst(family)}
              </option>
            ))}
          </select>
          <p className={styles.hint}>This is how PAUSE finds similar pieces. Your word still shows on the card.</p>
        </div>
      )}

      <input type="hidden" name="colorFamily" value={value.family} />
      <input type="hidden" name="colorName" value={otherOpen ? value.other : ""} />
    </fieldset>
  );
}

// For plain server-rendered forms that only need the two posted values.
export function ColorPickerField({
  common,
  initialFamily,
  initialOther,
}: {
  common: readonly string[];
  initialFamily: string;
  initialOther: string;
}) {
  const [value, setValue] = useState<ColorValue>({ family: initialFamily, other: initialOther });
  return <ColorPicker common={common} value={value} onChange={setValue} />;
}
