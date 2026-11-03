"use client";

import { Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useDrag, useGesture } from "@use-gesture/react";
import {
  addPiece,
  bringToFront,
  growPiece,
  movePiece,
  nudgePiece,
  removePiece,
  resizePiece,
  stepZ,
} from "@/lib/looks/boardOps";
import { hasUnsavedChanges } from "@/lib/looks/dirty";
import { MAX_PIECES, MAX_SCALE, MIN_SCALE, type LookPlacement } from "@/lib/looks/placements";
import { receiveSuggestion, type SuggestionResult } from "@/lib/looks/suggestion";
import { CATEGORIES, OTHER_CATEGORY } from "@/lib/wardrobeView";
import { ItemImage } from "../../wardrobe/WardrobeParts";
import { PieceCard } from "../PieceCard";
import styles from "./board.module.css";

export type BoardItem = {
  id: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  category: string | null;
  categoryKey: string;
};

type Props = {
  lookId: string | null;
  initialName: string;
  // The name the look gets if the field is left empty ("Look 03").
  namePlaceholder: string;
  initialPieces: LookPlacement[];
  inspiredByDesiredItemId: string | null;
  // "Built instead of [item]" - the wanted item's name, text only.
  builtInstead: string | null;
  items: BoardItem[];
  returnTo: string;
  // A suggested outfit still being worked out. The board opens at once; if the
  // suggestion arrives before anything has been touched it is placed, and if
  // not it is dropped. Null when the board opened blank or on a saved look.
  suggestion: Promise<SuggestionResult> | null;
};

const BOARD_ASPECT_HEIGHT = 1.25; // height / width of the 4:5 board
const NUDGE = 0.02;

// The full-screen board. Dragging, pinching and the corner handle are the
// quick ways to change a look; every one of them is also a button (and an
// arrow key) so nothing depends on a gesture.
export function Board({
  lookId,
  initialName,
  namePlaceholder,
  initialPieces,
  inspiredByDesiredItemId,
  builtInstead,
  items,
  returnTo,
  suggestion,
}: Props) {
  const router = useRouter();
  const [pieces, setPieces] = useState<LookPlacement[]>(initialPieces);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState(initialName);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boardWidth, setBoardWidth] = useState(300);
  const boardRef = useRef<HTMLDivElement>(null);

  // "Touched" means the person has changed anything. A late suggestion never
  // overwrites a touched board. "Saved" is what the board holds as far as the
  // person's work goes: a placed suggestion is not their work, so it moves the
  // baseline with it and leaving after it is not "unsaved changes".
  const touchedRef = useRef(false);
  const [pending, setPending] = useState(suggestion !== null);
  const [suggestionNotice, setSuggestionNotice] = useState<string | null>(null);
  const [baseline, setBaseline] = useState({ name: initialName, pieces: initialPieces });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const dirty = hasUnsavedChanges(baseline, { name, pieces });

  // Every change the person makes goes through here.
  const edit = useCallback((update: (pieces: LookPlacement[]) => LookPlacement[]) => {
    touchedRef.current = true;
    setPending(false);
    setPieces(update);
  }, []);

  const applySuggestion = useCallback(
    (result: SuggestionResult) => {
      const outcome = receiveSuggestion({ touched: touchedRef.current, pieces: initialPieces }, result);
      setPending(false);
      setSuggestionNotice(outcome.notice);
      if (outcome.placed) {
        setPieces(outcome.pieces);
        setBaseline({ name: initialName, pieces: outcome.pieces });
      }
    },
    [initialPieces, initialName]
  );

  // Closing the tab or reloading with unsaved work asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (confirmOpen && !dialog.open) dialog.showModal();
    if (!confirmOpen && dialog.open) dialog.close();
  }, [confirmOpen]);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  // Gestures report pixels; pieces are stored as fractions of the board.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setBoardWidth(el.clientWidth || 300));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selectedPiece = pieces.find((piece) => piece.wardrobeItemId === selected) ?? null;
  const selectedItem = selected ? itemById.get(selected) : undefined;

  function select(id: string | null) {
    setSelected(id);
  }

  async function save() {
    setConfirmOpen(false);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(lookId ? `/api/looks/${lookId}` : "/api/looks", {
        method: lookId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          inspiredByDesiredItemId,
          placements: pieces,
        }),
      });
      if (!response.ok) {
        setError("That didn't save. Try again in a moment.");
        setSaving(false);
        return;
      }
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("That didn't save. Try again in a moment.");
      setSaving(false);
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => (dirty ? setConfirmOpen(true) : router.push(returnTo))}
        >
          Close
        </button>
        <div className={styles.nameField}>
          <label htmlFor="look-name" className="sr-only">
            Look name
          </label>
          <input
            id="look-name"
            value={name}
            onChange={(event) => {
              touchedRef.current = true;
              setPending(false);
              setName(event.target.value);
            }}
            placeholder={namePlaceholder}
            maxLength={60}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          className={`btn-primary ${styles.saveBtn}`}
          onClick={save}
          disabled={saving || pieces.length === 0}
        >
          {saving ? "Saving" : "Save"}
        </button>
      </header>

      {(builtInstead || suggestionNotice || error) && (
        <div className={styles.lines}>
          {builtInstead && <p className={styles.line}>Built instead of {builtInstead}</p>}
          {suggestionNotice && <p className={styles.line}>{suggestionNotice}</p>}
          {error && (
            <p className={styles.line} role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      <div className={styles.stage}>
        <div className={styles.boardArea}>
          <div
            ref={boardRef}
            className={styles.board}
            role="group"
            aria-label="Look board"
            onPointerDown={(event) => {
              // A tap on the empty board clears the selection.
              if (event.target === event.currentTarget) select(null);
            }}
          >
            {pieces.length === 0 && (
              <p className={styles.emptyBoard} role="status">
                {pending ? "Styling a suggestion…" : "Add a piece from your closet to begin."}
              </p>
            )}
            {suggestion && pending && (
              <Suspense fallback={null}>
                <SuggestionSlot promise={suggestion} onArrive={applySuggestion} />
              </Suspense>
            )}
            {/* A stable DOM order: stacking is z-index. Re-ordering the nodes
                when a piece comes to the front would drop an in-progress drag. */}
            {[...pieces]
              .sort((a, b) => a.wardrobeItemId.localeCompare(b.wardrobeItemId))
              .map((piece) => {
                const item = itemById.get(piece.wardrobeItemId);
                if (!item) return null;
                return (
                  <BoardPiece
                    key={piece.wardrobeItemId}
                    piece={piece}
                    item={item}
                    boardWidth={boardWidth}
                    selected={piece.wardrobeItemId === selected}
                    onSelect={select}
                    onChange={edit}
                  />
                );
              })}
            {selectedPiece && (
              <ResizeHandle piece={selectedPiece} boardWidth={boardWidth} onChange={edit} />
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <SelectionBar
            selected={selectedPiece ? selectedPiece.wardrobeItemId : null}
            name={selectedItem?.name ?? null}
            onChange={edit}
            onRemoved={() => select(null)}
          />

          <div className={styles.rowButtons}>
            <button type="button" className={`action ${styles.addBtn}`} onClick={() => setDrawerOpen(true)}>
              Add pieces
            </button>
            <button
              type="button"
              className="action"
              onClick={() => {
                edit(() => []);
                select(null);
              }}
              disabled={pieces.length === 0 && !pending}
            >
              Start blank
            </button>
          </div>

          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            items={items}
            onBoard={new Set(pieces.map((piece) => piece.wardrobeItemId))}
            full={pieces.length >= MAX_PIECES}
            onPick={(id) => {
              edit((current) => addPiece(current, id));
              select(id);
            }}
          />
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="leave-title"
        onClose={() => setConfirmOpen(false)}
      >
        <h2 id="leave-title" className={styles.dialogTitle}>
          Leave without saving?
        </h2>
        <p className={styles.dialogText}>Your changes to this look will be lost.</p>
        <div className="action-group">
          <button type="button" className="btn-primary action" onClick={save} disabled={saving || pieces.length === 0}>
            Save
          </button>
          <button type="button" className="action" onClick={() => router.push(returnTo)}>
            Leave
          </button>
          <button type="button" className="action action--quiet" onClick={() => setConfirmOpen(false)}>
            Keep editing
          </button>
        </div>
      </dialog>
    </div>
  );
}

// Reads the suggestion once it has arrived (the board is already on screen and
// usable while it is pending) and hands it to the board to place or drop.
function SuggestionSlot({
  promise,
  onArrive,
}: {
  promise: Promise<SuggestionResult>;
  onArrive: (result: SuggestionResult) => void;
}) {
  const result = use(promise);
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    onArrive(result);
  }, [result, onArrive]);
  return null;
}

// ---------- A piece on the board ----------

function BoardPiece({
  piece,
  item,
  boardWidth,
  selected,
  onSelect,
  onChange,
}: {
  piece: LookPlacement;
  item: BoardItem;
  boardWidth: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (update: (pieces: LookPlacement[]) => LookPlacement[]) => void;
}) {
  const id = piece.wardrobeItemId;
  const boardHeight = boardWidth * BOARD_ASPECT_HEIGHT;

  const bind = useGesture(
    {
      onDrag: ({ first, tap, movement: [mx, my], memo }) => {
        if (tap) {
          onSelect(id);
          return memo;
        }
        let start = memo as { x: number; y: number } | undefined;
        if (first || !start) {
          onSelect(id);
          onChange((pieces) => bringToFront(pieces, id));
          start = { x: piece.x, y: piece.y };
        }
        onChange((pieces) => movePiece(pieces, id, start!.x + mx / boardWidth, start!.y + my / boardHeight));
        return start;
      },
      onPinch: ({ offset: [scale], first }) => {
        if (first) onSelect(id);
        onChange((pieces) => resizePiece(pieces, id, scale));
      },
    },
    {
      drag: { filterTaps: true, pointer: { touch: true } },
      pinch: { from: () => [piece.scale, 0], scaleBounds: { min: MIN_SCALE, max: MAX_SCALE }, pointer: { touch: true } },
    }
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const big = event.shiftKey ? 5 : 1;
    switch (event.key) {
      case "ArrowLeft":
        onChange((pieces) => nudgePiece(pieces, id, -0.01 * big, 0));
        break;
      case "ArrowRight":
        onChange((pieces) => nudgePiece(pieces, id, 0.01 * big, 0));
        break;
      case "ArrowUp":
        onChange((pieces) => nudgePiece(pieces, id, 0, -0.01 * big));
        break;
      case "ArrowDown":
        onChange((pieces) => nudgePiece(pieces, id, 0, 0.01 * big));
        break;
      case "+":
      case "=":
        onChange((pieces) => growPiece(pieces, id, 0.03));
        break;
      case "-":
      case "_":
        onChange((pieces) => growPiece(pieces, id, -0.03));
        break;
      case "]":
        onChange((pieces) => stepZ(pieces, id, 1));
        break;
      case "[":
        onChange((pieces) => stepZ(pieces, id, -1));
        break;
      case "Delete":
      case "Backspace":
        onChange((pieces) => removePiece(pieces, id));
        break;
      case "Enter":
      case " ":
        onSelect(id);
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  return (
    <div
      {...bind()}
      className={`${styles.piece}${selected ? ` ${styles.pieceSelected}` : ""}`}
      style={{
        left: `${piece.x * 100}%`,
        top: `${piece.y * 100}%`,
        width: `${piece.scale * 100}%`,
        zIndex: piece.zOrder + 1,
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${item.name}. ${
        selected
          ? "Selected. Arrow keys move it, plus and minus resize, square brackets change the order, Delete removes it."
          : "Press Enter to select."
      }`}
      onFocus={() => onSelect(id)}
      onKeyDown={onKeyDown}
    >
      <PieceCard name={item.name} imageUrl={item.imageUrl} category={item.category} />
    </div>
  );
}

// The corner handle on the selected piece: drag to resize.
function ResizeHandle({
  piece,
  boardWidth,
  onChange,
}: {
  piece: LookPlacement;
  boardWidth: number;
  onChange: (update: (pieces: LookPlacement[]) => LookPlacement[]) => void;
}) {
  const id = piece.wardrobeItemId;
  const bind = useDrag(
    ({ first, movement: [mx, my], memo }) => {
      const start = first || memo === undefined ? piece.scale : (memo as number);
      // Down and to the right grows the piece; the card is 4:5, so a vertical
      // pull counts for a little less than a horizontal one.
      const delta = (mx + my * 0.8) / 2 / boardWidth;
      onChange((pieces) => resizePiece(pieces, id, start + delta));
      return start;
    },
    { pointer: { touch: true } }
  );

  return (
    <button
      type="button"
      {...bind()}
      className={styles.handle}
      style={{
        // Kept inside the board's edge so it can always be reached.
        left: `min(${(piece.x + piece.scale) * 100}%, calc(100% - 22px))`,
        top: `min(${(piece.y + piece.scale) * 100}%, calc(100% - 22px))`,
        zIndex: 100,
      }}
      aria-label="Resize. Drag, or use the Smaller and Larger buttons."
      tabIndex={-1}
    >
      <span aria-hidden="true" />
    </button>
  );
}

// ---------- Buttons for the selected piece ----------

function SelectionBar({
  selected,
  name,
  onChange,
  onRemoved,
}: {
  selected: string | null;
  name: string | null;
  onChange: (update: (pieces: LookPlacement[]) => LookPlacement[]) => void;
  onRemoved: () => void;
}) {
  if (!selected) {
    return <p className={styles.hint}>Tap a piece to move, resize or remove it.</p>;
  }
  const id = selected;
  return (
    <div className={styles.selection} role="group" aria-label={`Edit ${name ?? "piece"}`}>
      <p className={styles.selectionName}>{name}</p>
      <div className={styles.buttons}>
        <button type="button" className="btn-sized" onClick={() => onChange((p) => nudgePiece(p, id, -NUDGE, 0))} aria-label="Move left">
          <span aria-hidden="true">←</span>
        </button>
        <button type="button" className="btn-sized" onClick={() => onChange((p) => nudgePiece(p, id, 0, -NUDGE))} aria-label="Move up">
          <span aria-hidden="true">↑</span>
        </button>
        <button type="button" className="btn-sized" onClick={() => onChange((p) => nudgePiece(p, id, 0, NUDGE))} aria-label="Move down">
          <span aria-hidden="true">↓</span>
        </button>
        <button type="button" className="btn-sized" onClick={() => onChange((p) => nudgePiece(p, id, NUDGE, 0))} aria-label="Move right">
          <span aria-hidden="true">→</span>
        </button>
        <button type="button" className="btn-sized" onClick={() => onChange((p) => growPiece(p, id, -0.05))}>
          Smaller
        </button>
        <button type="button" className="btn-sized" onClick={() => onChange((p) => growPiece(p, id, 0.05))}>
          Larger
        </button>
        <button type="button" className="btn-sized" onClick={() => onChange((p) => stepZ(p, id, 1))}>
          Forward
        </button>
        <button type="button" className="btn-sized" onClick={() => onChange((p) => stepZ(p, id, -1))}>
          Back
        </button>
        <button
          type="button"
          className="btn-sized"
          onClick={() => {
            onChange((p) => removePiece(p, id));
            onRemoved();
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ---------- The wardrobe drawer ----------

function Drawer({
  open,
  onClose,
  items,
  onBoard,
  full,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  items: BoardItem[];
  onBoard: ReadonlySet<string>;
  full: boolean;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const chips = useMemo(() => {
    const present = new Set(items.map((item) => item.categoryKey));
    return [...CATEGORIES, OTHER_CATEGORY].filter((c) => present.has(c.key));
  }, [items]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.categoryKey !== category) return false;
      if (!needle) return true;
      return [item.name, item.brand, item.category].some((part) => part?.toLowerCase().includes(needle));
    });
  }, [items, query, category]);

  return (
    <section className={styles.drawer} data-open={open} aria-label="Your closet">
      <div className={styles.drawerHead}>
        <h2 className={styles.drawerTitle}>Your closet</h2>
        <button type="button" className={`btn-sized ${styles.drawerClose}`} onClick={onClose}>
          Done
        </button>
      </div>

      <label htmlFor="drawer-search" className="sr-only">
        Search your closet
      </label>
      <input
        id="drawer-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search your closet"
        autoComplete="off"
        className={styles.drawerSearch}
      />

      <div className={styles.chips} role="group" aria-label="Filter by category">
        <button type="button" className={styles.chip} aria-pressed={category === "all"} onClick={() => setCategory("all")}>
          All
        </button>
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className={styles.chip}
            aria-pressed={category === chip.key}
            onClick={() => setCategory(chip.key)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {full && <p className={styles.hint}>The board is full. Remove a piece to add another.</p>}

      {shown.length === 0 ? (
        <p className={styles.hint}>No pieces match.</p>
      ) : (
        <ul className={styles.drawerGrid} role="list">
          {shown.map((item) => {
            const placed = onBoard.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.drawerItem}
                  aria-pressed={placed}
                  disabled={full && !placed}
                  onClick={() => onPick(item.id)}
                  aria-label={`${item.name}${placed ? ", on the board. Select it" : ". Add to the board"}`}
                >
                  <span className={styles.drawerThumb}>
                    <ItemImage item={{ imageUrl: item.imageUrl, displayName: item.name, category: item.category }} sizes="8rem" compact />
                    {placed && <span className={styles.onBoardTag}>On board</span>}
                  </span>
                  <span className={styles.drawerName}>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
