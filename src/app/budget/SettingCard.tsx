"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./budget.module.css";

// One Budget & goals setting, laid out as a Polaris annotated section: the
// title and a plain description on the left, the setting's card on the right
// (stacked on phones). The card states the status as a badge ("On" / "Off")
// and has one button that says exactly what it does. "Turn on" reveals the
// form that sets the value; nothing is switched on without one. "Turn off"
// posts to `offAction`, which removes the figure and nothing else.
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

  return (
    <section className={styles.annotated} aria-labelledby={titleId}>
      <div className={styles.annotation}>
        <h2 id={titleId} className={styles.cardTitle}>
          {title}
        </h2>
        <p className={styles.cardDescription}>{description}</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <span className={`${styles.badge} ${enabled ? styles.badgeOn : ""}`}>{enabled ? "On" : "Off"}</span>
          {enabled ? (
            <form method="post" action={offAction}>
              {Object.entries(offFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <button type="submit" className="btn-quiet">
                Turn off
              </button>
            </form>
          ) : (
            !open && (
              <button
                type="button"
                className="btn"
                aria-expanded={false}
                aria-controls={regionId}
                onClick={() => setOpen(true)}
              >
                Turn on
              </button>
            )
          )}
        </div>
        {enabled ? (
          <div className={styles.cardBody}>{onContent}</div>
        ) : (
          <div id={regionId} className={styles.cardBody} hidden={!open}>
            {offContent}
            <button type="button" className={`btn-quiet ${styles.cancel}`} onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
