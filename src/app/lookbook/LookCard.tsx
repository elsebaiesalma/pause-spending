"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LookThumb, type ThumbPiece } from "./LookThumb";
import styles from "./lookbook.module.css";

export type LookCardData = {
  id: string;
  name: string;
  dateLabel: string;
  // Text only: "Built instead of [item name]". Never the wanted item's photo.
  builtInstead: string | null;
  pieces: ThumbPiece[];
};

type Mode = "idle" | "renaming" | "confirmingDelete";

// One saved look: its board as a thumbnail, name and date, and a ⋯ menu to
// rename or delete. Tapping the card opens the board to edit it.
export function LookCard({ look }: { look: LookCardData }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [name, setName] = useState(look.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(method: "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/looks/${look.id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        setError("That didn't work. Try again in a moment.");
        setBusy(false);
        return;
      }
      setMode("idle");
      setBusy(false);
      router.refresh();
    } catch {
      setError("That didn't work. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <article className={styles.card}>
      {mode === "idle" && (
        <a
          href={`/lookbook/board?look=${look.id}`}
          className={styles.cardLink}
          aria-label={`Open ${look.name}`}
        />
      )}

      <LookThumb pieces={look.pieces} />

      <div className={styles.cardBody}>
        {mode === "renaming" ? (
          <form
            className={styles.renameForm}
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) void request("PATCH", { name: name.trim() });
            }}
          >
            <label htmlFor={`rename-${look.id}`} className="sr-only">
              Look name
            </label>
            <input
              id={`rename-${look.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              autoFocus
              autoComplete="off"
            />
            <div className={styles.inlineButtons}>
              <button type="submit" className="btn-primary btn-sized" disabled={busy || !name.trim()}>
                Save
              </button>
              <button
                type="button"
                className="btn-sized"
                onClick={() => {
                  setName(look.name);
                  setMode("idle");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <h3 className={styles.cardName}>{look.name}</h3>
            <p className={styles.cardDate}>{look.dateLabel}</p>
            {look.builtInstead && <p className={styles.builtInstead}>Built instead of {look.builtInstead}</p>}
          </>
        )}

        {mode === "confirmingDelete" && (
          <div className={styles.confirm} role="group" aria-label={`Delete ${look.name}`}>
            <p className={styles.confirmText}>Delete this look?</p>
            <div className={styles.inlineButtons}>
              <button type="button" className="btn-sized" onClick={() => void request("DELETE")} disabled={busy}>
                Delete
              </button>
              <button type="button" className="btn-sized" onClick={() => setMode("idle")}>
                Keep
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>

      {mode === "idle" && (
        <details className={styles.menu}>
          <summary className={styles.menuToggle} aria-label={`More actions for ${look.name}`}>
            ⋯
          </summary>
          <div className={styles.menuPanel}>
            <button type="button" onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              setMode("renaming");
            }}>
              Rename
            </button>
            <button type="button" onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              setMode("confirmingDelete");
            }}>
              Delete
            </button>
          </div>
        </details>
      )}
    </article>
  );
}
