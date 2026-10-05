"use client";

import { useState } from "react";
import { hasAnyReflectionAnswer } from "@/lib/pauseScreen/reflectionForm";
import styles from "./page.module.css";

// A real submit button, never a disabled one - if this click handler
// somehow didn't run (JS failed to load), the button still submits and
// proceeds, same as Pause/Let it go. The gate only adds a friendly
// pre-check when JS is available: if the reflection form (shared - see
// page.tsx) has no answer yet, either saved from a previous visit
// (alreadyAnswered) or filled in live right now, block the submit, scroll
// to the reflection, and say why - never silently do nothing.
export function BuyAnywayButton({ formAction, alreadyAnswered }: { formAction: string; alreadyAnswered: boolean }) {
  const [showWarning, setShowWarning] = useState(false);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (alreadyAnswered) return;

    const form = event.currentTarget.form;
    if (form && hasAnyReflectionAnswer(new FormData(form))) return;

    event.preventDefault();
    setShowWarning(true);
    document.getElementById("reflection")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={styles.buyAnywayWrap}>
      <button
        type="submit"
        formAction={formAction}
        name="outcome"
        value="proceeded"
        onClick={handleClick}
        className={`btn-quiet ${styles.buyAnywayLink}`}
      >
        Buy anyway
      </button>
      {showWarning && (
        <p role="alert" className={styles.buyAnywayWarning}>
          Answer one quick question first
        </p>
      )}
    </div>
  );
}
