"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { capitalizeFirst } from "@/lib/wardrobeDisplay";
import { CATEGORIES } from "@/lib/wardrobeView";
import {
  MAX_NAME_LENGTH,
  addTag,
  removeTag,
  MAX_BRAND_LENGTH,
  todayISO,
  validateName,
  validatePrice,
  validateOwnedSince,
  type TagSuggestion,
} from "@/lib/pieceForm";
import { ColorPicker } from "./ColorPicker";
import { MonthYearWheel } from "./MonthYearWheel";
import { PhotoField } from "./PhotoField";
import { WarnIcon } from "./WarnIcon";
import styles from "./pieceForm.module.css";

export type PieceFormValues = {
  itemName: string;
  category: string;
  brand: string;
  price: string;
  colorFamily: string;
  colorName: string;
  styleTags: string[];
  useCaseTags: string[];
  ownedSince: string;
};

const EMPTY: PieceFormValues = {
  itemName: "",
  category: "",
  brand: "",
  price: "",
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
  brandPriceNote,
  commonColors,
  photosEnabled = false,
  photoUrl = null,
}: {
  mode: "add" | "edit";
  action: string;
  initial?: PieceFormValues;
  cancelHref: string;
  submitLabel: string;
  // Set for a piece that came from an order: its brand and price are the
  // order's, so those two fields are replaced by this note.
  brandPriceNote?: string;
  // The colours this closet has most of; the picker shows these first.
  commonColors: readonly string[];
  // Photo upload shows only once photo storage exists (prisma/manual/photos.sql).
  photosEnabled?: boolean;
  photoUrl?: string | null;
}) {
  const [values, setValues] = useState<PieceFormValues>(initial);
  const [errors, setErrors] = useState<{
    itemName: string | null;
    ownedSince: string | null;
    price: string | null;
  }>({ itemName: null, ownedSince: null, price: null });
  const [suggest, setSuggest] = useState<SuggestState>("idle");
  const [suggestNote, setSuggestNote] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const tagsTouched = useRef(false);
  const lastAsked = useRef("");
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const today = todayISO();
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 41 }, (_, i) => thisYear - i);
  const ownedLabel = (() => {
    const match = /^(\d{4})-(\d{2})/.exec(values.ownedSince);
    return match
      ? `${new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleString("en-US", { month: "long" })} ${match[1]}`
      : null;
  })();

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

  function checkPrice() {
    const message = validatePrice(values.price);
    setErrors((current) => ({ ...current, price: message }));
    return message;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const nameError = checkName();
    const priceError = brandPriceNote ? null : checkPrice();
    const dateError = checkDate();
    if (nameError || priceError || dateError) {
      event.preventDefault();
      const first = nameError ? "itemName" : priceError ? "price" : "ownedSince";
      if (first !== "itemName") {
        // The date lives under "More details", which must be open to show it.
        const details = formRef.current?.querySelector("details");
        if (details) details.open = true;
      }
      const target = first === "ownedSince" ? "#piece-owned-since" : `[name="${first}"]`;
      formRef.current?.querySelector<HTMLElement>(target)?.focus();
      return;
    }
    submitting.current = true;
  }

  const hasTags = values.styleTags.length > 0 || values.useCaseTags.length > 0;
  const showTags = hasTags || suggest !== "idle" || mode === "edit";
  const categoryKnown = CATEGORIES.some((c) => c.key === values.category);
  const detailsOpen = Boolean(initial.brand || initial.price || initial.ownedSince);

  return (
    <form ref={formRef} action={action} method="POST" encType="multipart/form-data" className={styles.form} onSubmit={onSubmit} noValidate>
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

      <div className={styles.wide}>
        <ColorPicker
          common={commonColors}
          value={{ family: values.colorFamily, other: values.colorName }}
          onChange={(next) => update({ colorFamily: next.family, colorName: next.other })}
        />
      </div>

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
          {photosEnabled && (
            <div className={`${styles.field} ${styles.wide}`}>
              <PhotoField currentUrl={photoUrl} alt="Your photo of this piece" />
            </div>
          )}
          {brandPriceNote ? (
            <p className={`${styles.hint} ${styles.wide}`}>{brandPriceNote}</p>
          ) : (
            <>
              <div className={styles.field}>
                <label htmlFor="piece-brand">Brand</label>
                <input
                  id="piece-brand"
                  name="brand"
                  value={values.brand}
                  maxLength={MAX_BRAND_LENGTH}
                  placeholder="e.g. Aritzia"
                  autoComplete="off"
                  onChange={(event) => update({ brand: event.target.value })}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="piece-price">Price</label>
                <span className="money-field">
                  <span aria-hidden="true">$</span>
                  <input
                    id="piece-price"
                    name="price"
                    inputMode="decimal"
                    value={values.price}
                    placeholder="0.00"
                    autoComplete="off"
                    aria-invalid={errors.price ? true : undefined}
                    aria-describedby={errors.price ? "piece-price-error" : undefined}
                    onChange={(event) => {
                      update({ price: event.target.value });
                      if (errors.price) setErrors((current) => ({ ...current, price: null }));
                    }}
                    onBlur={checkPrice}
                  />
                </span>
                <FieldError id="piece-price-error" message={errors.price} />
              </div>
            </>
          )}
          <div className={`${styles.field} ${styles.wide}`}>
            <span className={styles.fieldLabel} id="piece-owned-since-label">
              Owned since
            </span>
            <input type="hidden" name="ownedSince" value={values.ownedSince} />
            <button
              type="button"
              id="piece-owned-since"
              className={styles.dateTrigger}
              aria-haspopup="true"
              aria-expanded={dateOpen}
              aria-labelledby="piece-owned-since-label piece-owned-since"
              aria-describedby={errors.ownedSince ? "piece-owned-since-error" : undefined}
              onClick={() => {
                setDateOpen((open) => !open);
              }}
            >
              <span data-empty={!ownedLabel || undefined}>{ownedLabel ?? "Select month and year"}</span>
              <span className={styles.dateChevron} aria-hidden="true" data-open={dateOpen || undefined} />
            </button>
            {dateOpen && (
              <div
                className={styles.datePanel}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setDateOpen(false);
                    formRef.current?.querySelector<HTMLElement>("#piece-owned-since")?.focus();
                  }
                }}
              >
                <MonthYearWheel
                  value={values.ownedSince}
                  years={years}
                  onChange={(next) => {
                    update({ ownedSince: next });
                    setErrors((current) => ({ ...current, ownedSince: validateOwnedSince(next, today) }));
                  }}
                />
                {/* Full-width and stacked like a phone's own picker sheet. Set is the
                    outlined secondary (the form's "Add to closet" stays the page's one
                    filled button); Cancel is plain text and removes the choice. */}
                <div className={styles.dateActions}>
                  <button type="button" className="btn" onClick={() => setDateOpen(false)}>
                    Set
                  </button>
                  <button
                    type="button"
                    className="btn-quiet"
                    onClick={() => {
                      update({ ownedSince: "" });
                      setErrors((current) => ({ ...current, ownedSince: validateOwnedSince("", today) }));
                      setDateOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
