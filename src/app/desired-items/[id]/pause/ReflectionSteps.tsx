"use client";

import { useState, type ReactNode } from "react";
import styles from "./page.module.css";

type Step = { title: string; body: ReactNode };

// One question at a time, then what buying does to the plan. Every step stays
// mounted (only hidden), so an answer given on step 1 is still in the form when
// any button below is pressed, and with no script the questions simply all show.
// Skipping is always allowed: nothing here gates a decision.
export function ReflectionSteps({ questions, impact }: { questions: Step[]; impact: ReactNode }) {
  const [index, setIndex] = useState(0);
  const total = questions.length;
  const onImpact = index === total;

  return (
    <div className={styles.steps} data-step={index}>
      <p className={styles.stepCount} aria-live="polite">
        {onImpact ? "What it does to your plan" : `Question ${index + 1} of ${total}`}
      </p>

      {questions.map((step, i) => (
        <div key={step.title} hidden={i !== index} className={styles.stepBody}>
          {step.body}
        </div>
      ))}
      <div hidden={!onImpact} className={styles.stepBody}>
        {impact}
      </div>

      <div className={styles.stepNav}>
        {index > 0 ? (
          <button type="button" className="action action--quiet" onClick={() => setIndex(index - 1)}>
            Back
          </button>
        ) : (
          <span />
        )}
        {!onImpact && (
          <div className={styles.stepNext}>
            {/* Not on the last question: its fields are all optional, so "See the cost"
                already is the skip. */}
            {index < total - 1 && (
              <button type="button" className="action action--quiet" onClick={() => setIndex(index + 1)}>
                Skip
              </button>
            )}
            <button type="button" className="btn" onClick={() => setIndex(index + 1)}>
              {index === total - 1 ? "See the cost" : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
