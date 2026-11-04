"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./budget.module.css";

// One Budget & goals setting: a title, a plain description, and a switch.
// Switching off posts to `offAction` (it removes the figure, never anything
// else). Switching on from off reveals `offContent`, the form that sets it,
// instead of turning on a thing that has no value yet. The switch is a real
// button with role="switch", labelled by the title, and works with the keyboard.
export function SettingCard({
  title,
  description,
  enabled,
  offAction,
  offFields,
  onContent,
  offContent,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  enabled: boolean;
  offAction: string;
  offFields: Record<string, string>;
  onContent: ReactNode;
  offContent: ReactNode;
  // Arrives already open from "Set a plan" links elsewhere.
  defaultOpen?: boolean;
}) {
  const titleId = useId();
  const regionId = useId();
  const [open, setOpen] = useState(defaultOpen);

  const toggle = (
    <button
      type={enabled ? "submit" : "button"}
      role="switch"
      aria-checked={enabled}
      aria-labelledby={titleId}
      aria-controls={enabled ? undefined : regionId}
      aria-expanded={enabled ? undefined : open}
      className={styles.switch}
      onClick={enabled ? undefined : () => setOpen((value) => !value)}
    >
      <span className={styles.switchKnob} aria-hidden="true" />
    </button>
  );

  return (
    <section className={`${styles.card} ${enabled ? "" : styles.cardOff}`}>
      <div className={styles.cardTop}>
        <div className={styles.cardText}>
          <h2 id={titleId} className={styles.cardTitle}>
            {title}
          </h2>
          <p className={styles.cardDescription}>{description}</p>
        </div>
        {enabled ? (
          <form method="post" action={offAction}>
            {Object.entries(offFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            {toggle}
          </form>
        ) : (
          toggle
        )}
      </div>
      {enabled ? (
        <div className={styles.cardBody}>{onContent}</div>
      ) : (
        <div id={regionId} className={styles.cardBody} hidden={!open}>
          {offContent}
        </div>
      )}
    </section>
  );
}
