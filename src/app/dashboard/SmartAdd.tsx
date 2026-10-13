"use client";

import { useRef, useState } from "react";
import { classifySmartAddInput } from "@/lib/dashboard/smartAdd";
import styles from "./page.module.css";

// One box for every way in. A pasted link goes to the URL route; typed text
// goes to the search step when search is configured (it lists matches to pick
// from) and straight to the text route otherwise. A screenshot is picked with
// the button beside it and submitted on its own. All of them end at the same
// confirm step, because those routes already do.
//
// Laid out like the Add item page: one 24rem column, a 3rem input and the
// shared action buttons, with the two buttons side by side under the box.
export function SmartAdd({ searchAvailable }: { searchAvailable: boolean }) {
  const [value, setValue] = useState("");
  const screenshotForm = useRef<HTMLFormElement>(null);
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

  return (
    <div className={styles.smartAdd}>
      {/* Both forms are display: contents so the input and the two buttons
          share one grid: input on top, buttons side by side beneath. */}
      <form action={action} method={action === "/desired-items/new" ? "GET" : "POST"} className={styles.smartAddForm}>
        <input type="hidden" name={field} value={fieldValue} />
        <label htmlFor="smart-add" className="sr-only">
          Add an item
        </label>
        <input
          id="smart-add"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Paste a link or type what caught your eye"
          autoComplete="off"
          className={styles.smartAddInput}
        />
        <button type="submit" className="btn-primary action" disabled={input.kind === "empty"}>
          {input.kind === "url" ? "Look it up" : "Continue"}
        </button>
      </form>

      <form
        ref={screenshotForm}
        action="/api/desired-items/from-screenshot"
        method="POST"
        encType="multipart/form-data"
        className={styles.screenshotForm}
      >
        <label className={`btn action ${styles.screenshotBtn}`}>
          Screenshot
          <input
            type="file"
            name="screenshot"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              if (event.target.files?.length) screenshotForm.current?.requestSubmit();
            }}
          />
        </label>
      </form>
    </div>
  );
}
