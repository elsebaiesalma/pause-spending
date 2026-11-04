"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { COLOR_FAMILIES } from "@/lib/colorFamily";
import { swatchFor } from "@/lib/colorSwatch";
import { capitalizeFirst } from "@/lib/wardrobeDisplay";
import { CATEGORIES } from "@/lib/wardrobeView";
import {
  MAX_NAME_LENGTH,
  addTag,
  removeTag,
  todayISO,
  validateName,
  validateOwnedSince,
  type TagSuggestion,
} from "@/lib/pieceForm";
import { WarnIcon } from "./WarnIcon";
import styles from "./pieceForm.module.css";

export type PieceFormValues = {
  itemName: string;
  category: string;
  colorFamily: string;
  colorName: string;
  styleTags: string[];
  useCaseTags: string[];
  ownedSince: string;
};

const EMPTY: PieceFormValues = {
  itemName: "",
  category: "",
  colorFamily: "",
  colorName: "",
  styleTags: [],
  useCaseTags: [],
  ownedSince: "",
};

type SuggestState = "idle" | "loading" | "done" | "failed";

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className={styles.error} role="alert">
      <WarnIcon /> {message}
    </p>
  );
}

// Tags the person can take out, and add to. Typing then Enter (or a comma)
// adds one; the model's suggestions arrive in the same list, so accepting is
// doing nothing and changing is removing or adding.
function TagEditor({
  label,
  tags,
  onChange,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    if (draft.trim()) onChange(addTag(tags, draft));
    setDraft("");
  }

  return (
    <div className={styles.tagGroup}>
      <p className={styles.tagLabel}>{label}</p>
      <ul className={styles.chips}>
        {tags.map((tag) => (
          <li key={tag} className={styles.chip}>
            <span>{tag}</span>
            <button type="button" aria-label={`Remove ${label.toLowerCase()} tag ${tag}`} onClick={() => onChange(removeTag(tags, tag))}>
              <span aria-hidden="true">&times;</span>
            </button>
          </li>
        ))}
        <li className={styles.chipInput}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                commit();
              }
            }}
            onBlur={commit}
            placeholder="Add a tag"
            aria-label={`Add a ${label.toLowerCase()} tag`}
            maxLength={30}
            autoComplete="off"
          />
        </li>
      </ul>
    </div>
  );
}

// The form for adding a piece to the closet and for editing one, so the two
// can never drift apart. Every field has a visible label; Name and the date
// are checked when you leave them (not on each keystroke) with the message
// under the field; the less common fields sit under "More details".
// Tags are suggested by the model once there is a name, and stay editable.
export function PieceForm({
  mode,
  action,
  initial = EMPTY,
  cancelHref,
  submitLabel,
}: {
  mode: "add" | "edit";
  action: string;
  initial?: PieceFormValues;
  cancelHref: string;
  submitLabel: string;
}) {
  const [values, setValues] = useState<PieceFormValues>(initial);
  const [errors, setErrors] = useState<{ itemName: string | null; ownedSince: string | null }>({
    itemName: null,
    ownedSince: null,
  });
  const [suggest, setSuggest] = useState<SuggestState>("idle");
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const tagsTouched = useRef(false);
  const lastAsked = useRef("");
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const today = todayISO();

  // Leaving with half a form filled asks first; submitting never does.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (submitting.current) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(patch: Partial<PieceFormValues>) {
    setValues((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  function setTags(key: "styleTags" | "useCaseTags", tags: string[]) {
    tagsTouched.current = true;
    update(key === "styleTags" ? { styleTags: tags } : { useCaseTags: tags });
  }

  async function askForSuggestion(force: boolean) {
    const name = values.itemName.trim();
    if (!name) return;
    const key = `${name}|${values.category}`;
    if (!force && lastAsked.current === key) return;
    lastAsked.current = key;
    setSuggest("loading");
    setSuggestNote(null);
    try {
      const response = await fetch("/api/wardrobe/suggest-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemName: name, category: values.category || null }),
      });
      const body = (await response.json()) as { suggestion?: TagSuggestion | null };
      const suggestion = body.suggestion;
      if (!response.ok || !suggestion) throw new Error("no suggestion");

      setValues((current) => ({
        ...current,
        // Only fill what the person has left empty; their own choices stand.
        category: current.category || suggestion.category || "",
        colorFamily: current.colorFamily || suggestion.colorFamily || "",
        colorName: current.colorName || suggestion.colorName || "",
        styleTags: force || !tagsTouched.current ? suggestion.styleTags : current.styleTags,
        useCaseTags: force || !tagsTouched.current ? suggestion.useCaseTags : current.useCaseTags,
      }));
      setSuggest("done");
      setSuggestNote(
        "Suggested from the name. Remove any that don't fit, or add your own."
      );
    } catch {
      setSuggest("failed");
      setSuggestNote("Couldn't suggest tags just now. You can add your own, or leave them and PAUSE tags it on save.");
    }
  }

  function checkName() {
    const message = validateName(values.itemName);
    setErrors((current) => ({ ...current, itemName: message }));
    return message;
  }

  function checkDate() {
    const message = validateOwnedSince(values.ownedSince, today);
    setErrors((current) => ({ ...current, ownedSince: message }));
    return message;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const nameError = checkName();
    const dateError = checkDate();
    if (nameError || dateError) {
      event.preventDefault();
      const first = nameError ? "itemName" : "ownedSince";
      if (first === "ownedSince") {
        // The date lives under "More details", which must be open to show it.
        const details = formRef.current?.querySelector("details");
        if (details) details.open = true;
      }
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    submitting.current = true;
  }

  const hasTags = values.styleTags.length > 0 || values.useCaseTags.length > 0;
  const showTags = hasTags || suggest !== "idle" || mode === "edit";
  const categoryKnown = CATEGORIES.some((c) => c.key === values.category);
  const detailsOpen = Boolean(initial.colorName || initial.ownedSince);

  return (
    <form ref={formRef} action={action} method="POST" className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor="piece-name">
          Name <span className={styles.required}>(required)</span>
        </label>
        <input
          id="piece-name"
          name="itemName"
          value={values.itemName}
          maxLength={MAX_NAME_LENGTH}
          placeholder="e.g. Black wool coat"
          autoComplete="off"
          required
          aria-invalid={errors.itemName ? true : undefined}
          aria-describedby={errors.itemName ? "piece-name-error" : undefined}
          onChange={(event) => {
            update({ itemName: event.target.value });
            if (errors.itemName) setErrors((current) => ({ ...current, itemName: null }));
          }}
          onBlur={() => {
            if (!checkName() && mode === "add" && !tagsTouched.current) void askForSuggestion(false);
          }}
        />
        <FieldError id="piece-name-error" message={errors.itemName} />
      </div>

      <div className={styles.field}>
        <label htmlFor="piece-category">Category</label>
        <select
          id="piece-category"
          name="category"
          value={values.category}
          onChange={(event) => update({ category: event.target.value })}
        >
          <option value="">Choose a category</option>
          {CATEGORIES.map((category) => (
            <option key={category.key} value={category.key}>
              {category.label}
            </option>
          ))}
          {/* A category saved before this list existed stays selectable. */}
          {values.category && !categoryKnown && <option value={values.category}>{capitalizeFirst(values.category)}</option>}
        </select>
      </div>

      <fieldset className={`${styles.field} ${styles.wide}`}>
        <legend>Colour</legend>
        <div className={styles.swatches}>
          <label className={styles.swatch}>
            <input
              type="radio"
              name="colorFamily"
              value=""
              checked={values.colorFamily === ""}
              onChange={() => update({ colorFamily: "" })}
            />
            <span className={styles.dot} data-none="true" aria-hidden="true" />
            <span>Not sure</span>
          </label>
          {COLOR_FAMILIES.map((family) => {
            const swatch = swatchFor(family);
            return (
              <label key={family} className={styles.swatch}>
                <input
                  type="radio"
                  name="colorFamily"
                  value={family}
                  checked={values.colorFamily === family}
                  onChange={() => update({ colorFamily: family })}
                />
                <span
                  className={styles.dot}
                  aria-hidden="true"
                  style={
                    swatch?.kind === "multi"
                      ? { background: `linear-gradient(135deg, ${swatch.a} 50%, ${swatch.b} 50%)` }
                      : { background: swatch?.hex }
                  }
                />
                <span>{capitalizeFirst(family)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {showTags && (
        <fieldset className={`${styles.field} ${styles.wide}`}>
          <legend>Tags</legend>
          <TagEditor label="Style" tags={values.styleTags} onChange={(tags) => setTags("styleTags", tags)} />
          <TagEditor label="Use" tags={values.useCaseTags} onChange={(tags) => setTags("useCaseTags", tags)} />
          <input type="hidden" name="styleTags" value={values.styleTags.join(",")} />
          <input type="hidden" name="useCaseTags" value={values.useCaseTags.join(",")} />
          <p className={styles.hint} aria-live="polite">
            {suggest === "loading" ? "Suggesting tags…" : suggestNote}
          </p>
        </fieldset>
      )}

      {values.itemName.trim() && (
        <div className={`${styles.wide} ${styles.suggestRow}`}>
          <button
            type="button"
            className="btn-quiet"
            disabled={suggest === "loading"}
            onClick={() => void askForSuggestion(true)}
          >
            {suggest === "done" || hasTags ? "Suggest tags again" : "Suggest tags"}
          </button>
        </div>
      )}

      <details className={`${styles.more} ${styles.wide}`} open={detailsOpen || undefined}>
        <summary>More details</summary>
        <div className={styles.moreFields}>
          <div className={styles.field}>
            <label htmlFor="piece-color-name">Colour name</label>
            <input
              id="piece-color-name"
              name="colorName"
              value={values.colorName}
              placeholder="e.g. Espresso"
              autoComplete="off"
              onChange={(event) => update({ colorName: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="piece-owned-since">Owned since</label>
            <input
              id="piece-owned-since"
              name="ownedSince"
              type="date"
              value={values.ownedSince}
              max={today}
              aria-invalid={errors.ownedSince ? true : undefined}
              aria-describedby={errors.ownedSince ? "piece-owned-since-error" : undefined}
              onChange={(event) => {
                update({ ownedSince: event.target.value });
                if (errors.ownedSince) setErrors((current) => ({ ...current, ownedSince: null }));
              }}
              onBlur={checkDate}
            />
            <FieldError id="piece-owned-since-error" message={errors.ownedSince} />
          </div>
        </div>
      </details>

      <div className={`${styles.actions} ${styles.wide}`}>
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        <a href={cancelHref} className="btn-quiet">
          Cancel
        </a>
      </div>
    </form>
  );
}
