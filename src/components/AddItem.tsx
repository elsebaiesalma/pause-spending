"use client";

import { useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { classifySmartAddInput } from "@/lib/dashboard/smartAdd";
import styles from "./AddItem.module.css";

// One box for every way in, used on Home and on the Pause a purchase page.
// A pasted link goes to the URL route; typed text goes to the search step
// when search is configured and straight to the text route otherwise. A
// screenshot is added with the small button beside Continue (or dropped on it)
// and is submitted on its own, through a separate form the file input points at. All of them end at the same confirm step.
//
// Polaris: one primary action, never disabled. Pressing Continue with an
// empty box explains what to do instead of doing nothing.
export function AddItem({ searchAvailable, primary = true }: { searchAvailable: boolean; primary?: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const screenshotForm = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const errorId = useId();
  const screenshotFormId = useId();
  const input = classifySmartAddInput(value);

  let action = "/api/desired-items/from-text";
  let field = "text";
  let fieldValue = value.trim();
  if (input.kind === "url") {
    action = "/api/desired-items/from-url";
    field = "url";
    fieldValue = input.url;
  } else if (searchAvailable) {
    action = "/desired-items/new";
    field = "q";
  }

  const onSubmit = (event: FormEvent) => {
    if (input.kind === "empty") {
      event.preventDefault();
      setError("Paste a link or type what caught your eye first.");
    }
  };

  const submitScreenshot = () => {
    setReading(true);
    screenshotForm.current?.requestSubmit();
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const files = event.dataTransfer.files;
    if (!files.length || !fileInput.current || !files[0].type.startsWith("image/")) return;
    fileInput.current.files = files;
    submitScreenshot();
  };

  return (
    <div className={styles.addItem}>
      <form
        action={action}
        method={action === "/desired-items/new" ? "GET" : "POST"}
        className={styles.row}
        onSubmit={onSubmit}
        noValidate
      >
        <input type="hidden" name={field} value={fieldValue} />
        <label htmlFor={inputId} className="sr-only">
          What caught your eye
        </label>
        <input
          id={inputId}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="Paste a link or type what caught your eye"
          autoComplete="off"
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="submit" className={primary ? "btn btn-primary" : "btn"}>
          {input.kind === "url" ? "Look it up" : "Continue"}
        </button>
        <label
          className={styles.shot}
          data-dragging={dragging || undefined}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInput}
            form={screenshotFormId}
            type="file"
            name="screenshot"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              if (event.target.files?.length) submitScreenshot();
            }}
          />
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="1.75" />
            <path d="m21 16-5-5-9 9" />
          </svg>
          <span>{reading ? "Reading…" : "Add a screenshot"}</span>
        </label>
      </form>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}

      <form
        ref={screenshotForm}
        id={screenshotFormId}
        action="/api/desired-items/from-screenshot"
        method="POST"
        encType="multipart/form-data"
      />
    </div>
  );
}
