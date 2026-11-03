"use client";

import { useQueryParam } from "@/lib/dashboard/useQueryParam";
import styles from "./GoalCard.module.css";

const MESSAGES: Record<string, { text: string; error: boolean }> = {
  saved: { text: "Goal saved.", error: false },
  removed: { text: "Goal removed.", error: false },
  invalid: { text: "Add a name and an amount above $0, then try again.", error: true },
  unavailable: { text: "Goals aren't available yet. Try again later.", error: true },
};

// The result of the last goal action, read from ?goal=. A local component on
// purpose: ActionToast belongs to the let-go flow. Errors use role="alert" so
// they are announced; confirmations use role="status".
export function GoalStatus() {
  const value = useQueryParam("goal");
  const message = value ? MESSAGES[value] : undefined;
  if (!message) return null;
  return (
    <p className={message.error ? styles.error : styles.confirm} role={message.error ? "alert" : "status"}>
      {message.error && <span aria-hidden="true">&#9888; </span>}
      {message.text}
    </p>
  );
}
