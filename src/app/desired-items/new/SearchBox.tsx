"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchCandidate } from "@/lib/itemExtraction/searchProduct";

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "results"; candidates: SearchCandidate[]; scopedToBrand: string | null }
  | { status: "no-results" }
  | { status: "error" };

function fieldValue(value: string | number | null): string {
  return value === null ? "" : String(value);
}

export default function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [activeIndex, setActiveIndex] = useState(-1);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every new search attempt (debounce fire, or the effect's
  // give-up-early path) - a response is only applied if it's still the most
  // recent attempt, so a slow earlier response can never overwrite a
  // faster, newer one even if abort() itself doesn't land in time.
  const sequenceRef = useRef(0);
  const candidateFormRef = useRef<HTMLFormElement>(null);
  const manualFormRef = useRef<HTMLFormElement>(null);

  const runSearch = useCallback(async (q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const mySequence = ++sequenceRef.current;

    setState({ status: "loading" });
    setActiveIndex(-1);

    try {
      const response = await fetch(`/api/desired-items/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (mySequence !== sequenceRef.current) return;

      if (!response.ok) {
        setState({ status: "error" });
        return;
      }

      const body = (await response.json()) as { candidates: SearchCandidate[]; scopedToBrand: string | null };
      if (mySequence !== sequenceRef.current) return;

      setState(
        body.candidates.length === 0
          ? { status: "no-results" }
          : { status: "results", candidates: body.candidates, scopedToBrand: body.scopedToBrand }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (mySequence !== sequenceRef.current) return;
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      sequenceRef.current += 1;
      setState({ status: "idle" });
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(query.trim()), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const candidates = state.status === "results" ? state.candidates : [];
  const listboxId = "search-candidates-listbox";
  const activeId = activeIndex >= 0 ? `search-candidate-${activeIndex}` : undefined;

  function selectCandidate(candidate: SearchCandidate) {
    const form = candidateFormRef.current;
    if (!form) return;
    (form.elements.namedItem("url") as HTMLInputElement).value = candidate.url;
    (form.elements.namedItem("itemName") as HTMLInputElement).value = candidate.itemName;
    (form.elements.namedItem("price") as HTMLInputElement).value = fieldValue(candidate.price);
    (form.elements.namedItem("imageUrl") as HTMLInputElement).value = fieldValue(candidate.imageUrl);
    (form.elements.namedItem("category") as HTMLInputElement).value = fieldValue(candidate.category);
    (form.elements.namedItem("colorName") as HTMLInputElement).value = fieldValue(candidate.colorName);
    (form.elements.namedItem("colorFamily") as HTMLInputElement).value = fieldValue(candidate.colorFamily);
    (form.elements.namedItem("itemNameConfidence") as HTMLInputElement).value =
      candidate.confidence?.itemName ?? "";
    (form.elements.namedItem("brand") as HTMLInputElement).value =
      state.status === "results" ? fieldValue(state.scopedToBrand) : "";
    form.requestSubmit();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (candidates.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, candidates.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectCandidate(candidates[activeIndex]);
    } else if (event.key === "Escape") {
      abortRef.current?.abort();
      sequenceRef.current += 1;
      setQuery("");
      setState({ status: "idle" });
      setActiveIndex(-1);
    }
  }

  return (
    <div className="section">
      <label htmlFor="item-search">What are you thinking of buying?</label>
      <input
        id="item-search"
        role="combobox"
        aria-expanded={candidates.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. Zara navy wool blazer"
        style={{ minHeight: 44 }}
      />

      <p className="section">
        <button
          type="button"
          className="btn-quiet"
          style={{ minHeight: 44 }}
          onClick={() => manualFormRef.current?.requestSubmit()}
        >
          None of these - enter manually
        </button>
      </p>

      {state.status === "loading" && (
        <div className="stack" aria-live="polite" aria-label="Searching">
          <div className="item-row item-row--skeleton" />
          <div className="item-row item-row--skeleton" />
          <div className="item-row item-row--skeleton" />
        </div>
      )}

      {state.status === "results" && (
        <>
          <p className="page__lede" style={{ marginBottom: "0.5rem" }}>
            Closest matches - not guaranteed to be the exact item, check the details before confirming.
          </p>
          <ul id={listboxId} role="listbox" aria-label="Closest matches" className="stack" style={{ listStyle: "none", padding: 0 }}>
          {candidates.map((candidate, index) => (
            <li
              key={candidate.url}
              id={`search-candidate-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={-1}
              className="item-row"
              style={{
                cursor: "pointer",
                minHeight: 44,
                outline: index === activeIndex ? "2px solid var(--color-ink)" : "none",
                outlineOffset: "2px",
              }}
              onClick={() => selectCandidate(candidate)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {candidate.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={candidate.imageUrl} alt="" className="item-row__thumb" />
              ) : (
                <div className="item-row__thumb" aria-hidden="true" />
              )}
              <div className="item-row__body">
                <div
                  className="item-row__title"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    whiteSpace: "normal",
                  }}
                >
                  {candidate.itemName}
                </div>
                <div className="item-row__meta">
                  {candidate.merchant}
                  {candidate.category ? ` · ${candidate.category}` : ""}
                </div>
                {candidate.confidence?.itemName === "low" && (
                  <div className="item-row__meta" style={{ color: "var(--color-accent)" }}>
                    Low-confidence match - double-check before confirming
                  </div>
                )}
              </div>
              <div className="item-row__price">
                {candidate.price !== null ? (
                  `$${candidate.price.toFixed(2)}`
                ) : (
                  <span style={{ color: "var(--color-ink-soft)", fontWeight: 400 }}>price not found</span>
                )}
              </div>
            </li>
          ))}
          </ul>
        </>
      )}

      {state.status === "no-results" && (
        <p className="page__lede" aria-live="polite">
          No matches found - enter the details yourself below.
        </p>
      )}

      {state.status === "error" && (
        <p className="page__lede" aria-live="polite">
          Search isn&apos;t available right now - enter the details yourself below.
        </p>
      )}

      {/* Hidden forms, submitted programmatically - no candidate/manual path
          grows its own visible form, both land on the exact same confirm step. */}
      <form ref={candidateFormRef} action="/api/desired-items/from-search" method="POST" hidden>
        <input type="hidden" name="url" />
        <input type="hidden" name="itemName" />
        <input type="hidden" name="brand" />
        <input type="hidden" name="price" />
        <input type="hidden" name="imageUrl" />
        <input type="hidden" name="category" />
        <input type="hidden" name="colorName" />
        <input type="hidden" name="colorFamily" />
        <input type="hidden" name="itemNameConfidence" />
      </form>
      <form ref={manualFormRef} action="/api/desired-items/from-text" method="POST" hidden>
        <input type="hidden" name="text" value={query} readOnly />
      </form>
    </div>
  );
}
