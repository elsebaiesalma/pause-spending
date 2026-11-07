"use client";

import { useId, useState, type FormEvent } from "react";
import styles from "./AddItem.module.css";

// One box: type what caught your eye. Links and screenshots are not offered
// here because they are not read reliably yet; the confirm step is where the
// price and a photo are added by hand. Typed text goes to the search step when
// search is configured and straight to the text route otherwise.
//
// Polaris: one primary action, never disabled. Pressing Continue with an
// empty box explains what to do instead of doing nothing.
//
// In a demo, "Use sample item" sits beside Continue and takes the visitor
// straight to a pause screen without typing. It becomes the one filled button,
// since it is the path a first-time visitor should take.
export function AddItem({
  searchAvailable,
  primary = true,
  sampleItem = false,
}: {
  searchAvailable: boolean;
  primary?: boolean;
  sampleItem?: boolean;
}) {
  const [value, setValue] = useState("");
  const [samplePending, setSamplePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const sampleFormId = useId();

  const action = searchAvailable ? "/desired-items/new" : "/api/desired-items/from-text";
  const field = searchAvailable ? "q" : "text";

  const onSubmit = (event: FormEvent) => {
    if (!value.trim()) {
      event.preventDefault();
      setError("Type what caught your eye first.");
    }
  };

  return (
    <div className={styles.addItem} data-tour="add">
      <form
        action={action}
        method={searchAvailable ? "GET" : "POST"}
        className={`${styles.row} ${sampleItem ? styles.rowWithSample : ""}`}
        onSubmit={onSubmit}
        noValidate
      >
        <input type="hidden" name={field} value={value.trim()} />
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
          placeholder="Type what caught your eye, like “black shirt”"
          autoComplete="off"
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="submit" className={primary && !sampleItem ? "btn btn-primary" : "btn"}>
          Continue
        </button>
        {/* Submits the separate form below, so the button can sit in this row
            without nesting forms. */}
        {sampleItem && (
          <button
            type="submit"
            form={sampleFormId}
            className="btn btn-primary"
            disabled={samplePending}
            aria-busy={samplePending}
          >
            {samplePending ? "Opening…" : "Use sample item"}
          </button>
        )}
      </form>
      {sampleItem && (
        <form id={sampleFormId} action="/api/demo/sample-item" method="POST" onSubmit={() => setSamplePending(true)} />
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
