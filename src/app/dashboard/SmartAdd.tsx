"use client";

import { useRef, useState } from "react";
import { classifySmartAddInput } from "@/lib/dashboard/smartAdd";
import styles from "./page.module.css";

// One box for every way in. A pasted link goes to the URL route; typed text
// goes to the search step when search is configured (it lists matches to pick
// from) and straight to the text route otherwise. A screenshot is picked with
// the button and submitted on its own. All of them end at the same confirm
// step, because those routes already do.
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
        <button type="submit" className="btn btn-primary" disabled={input.kind === "empty"}>
          {input.kind === "url" ? "Look it up" : "Continue"}
        </button>
      </form>

      <form
        ref={screenshotForm}
        action="/api/desired-items/from-screenshot"
        method="POST"
        encType="multipart/form-data"
      >
        <label className={`btn ${styles.screenshotBtn}`}>
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
