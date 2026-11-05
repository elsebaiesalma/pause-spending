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
export function AddItem({ searchAvailable, primary = true }: { searchAvailable: boolean; primary?: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const action = searchAvailable ? "/desired-items/new" : "/api/desired-items/from-text";
  const field = searchAvailable ? "q" : "text";

  const onSubmit = (event: FormEvent) => {
    if (!value.trim()) {
      event.preventDefault();
      setError("Type what caught your eye first.");
    }
  };

  return (
    <div className={styles.addItem}>
      <form
        action={action}
        method={searchAvailable ? "GET" : "POST"}
        className={styles.row}
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
          placeholder="Type what caught your eye, like “black ankle boots”"
          autoComplete="off"
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button type="submit" className={primary ? "btn btn-primary" : "btn"}>
          Continue
        </button>
      </form>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
