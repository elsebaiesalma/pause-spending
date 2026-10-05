# Theme

## Part 1 — Compact token summary

Two separate token systems coexist in this app, each scoped to a different part of the site.

### System A — App shell (globals.css, `:root`) — "effortless editorial", cream/blush/burgundy

Used by every route except the landing page: `/dashboard`, `/wardrobe`, `/purchases`, `/budget`,
`/wishlist`, `/waiting`, `/desired-items/*`, `/connect/gmail/*`.

| Token | Value | Role |
|---|---|---|
| `--color-cream` | `#f4ede3` | page background |
| `--color-cream-deep` | `#ece0d2` | image/thumb placeholder fill |
| `--color-surface` | `#fffbf6` | input/card surface |
| `--color-ink` | `#2b211c` | primary text |
| `--color-ink-soft` | `#5c4c44` | secondary text |
| `--color-line` | `#ddccbc` | divider |
| `--color-line-soft` | `#e8dcc9` | lighter divider (item rows) |
| `--color-blush` | `#e6c6bd` | soft accent (note border, link underline) |
| `--color-rose` | `#c68f85` | mid accent (unused directly in CSS, reserved) |
| `--color-mauve` | `#9c747a` | eyebrow label color, focus ring |
| `--color-burgundy` | `#6d3138` | primary CTA fill, links, danger actions |

Fonts: `--font-display` = Cormorant Garamond (serif, headings), `--font-body` = Jost (sans, everything
else). Both loaded via `next/font/google` in `src/app/layout.tsx`.

Spacing scale: `--space-1: 0.5rem` · `--space-2: 0.75rem` · `--space-3: 1.25rem` · `--space-4: 2rem` ·
`--space-5: 3rem` · `--space-6: 5rem`.

Radius: effectively 1px everywhere (buttons, inputs, item thumbs) — a deliberately sharp, non-rounded,
editorial look, not a rounded SaaS aesthetic.

Theme is locked light — no `prefers-color-scheme` branching (`color-scheme: light` is hardcoded).

### System B — Landing page only (`src/app/page.module.css`) — "Daylight Editorial", white/pink

Used ONLY by `/` (the landing page). Do not mix with System A.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#ffffff` | page background |
| `--bg-alt` | `#f7f6f6` | card/section surface |
| `--ink` | `#0a0a0a` | primary text |
| `--ink-muted` | `rgba(10,10,10,0.6)` | secondary text |
| `--ink-faint` | `rgba(10,10,10,0.4)` | tertiary text |
| `--line` | `rgba(10,10,10,0.08)` | hairline divider |
| `--line-muted` | `rgba(10,10,10,0.16)` | stronger divider/border |
| `--accent` | `#fecdd3` | pink, light |
| `--accent-dim` | `#fdb3b9` | pink, deeper — the color used for most accent text/hovers |
| `--invert-bg` | `#0a0a0a` | footer panel (intentionally inverted) |
| `--invert-ink` | `#ffffff` | text on the inverted footer |

Display font: self-hosted **Clash Display** (`next/font/local`, `src/app/fonts.ts`, files in
`public/fonts/clash-display/*.woff2`), exposed as `--font-clash`, used for all headlines/stat figures.
Body font: reuses System A's Jost (`--font-body`).

The standalone mockups in `mockups/` (About, Wardrobe, Dashboard, Transactions, Wishlist,
Saved-for-later — placeholder previews, not wired to real data) also use this System B palette, via
`mockups/design-system.css`, which restates the same tokens for a plain (non-Next.js) HTML context and
adds `--font-mono` (Space Mono, for small tracked labels) and a `--width: 78rem` container max-width.

**Do not merge A and B.** The app deliberately runs two palettes: a cream "product" system for the
functional pages, a white/pink "marketing" system for the landing page and future mockups.

## Part 2 — Raw source

### `src/app/globals.css` (System A, full file)

```css
:root {
  --color-cream: #f4ede3;
  --color-cream-deep: #ece0d2;
  --color-surface: #fffbf6;
  --color-ink: #2b211c;
  --color-ink-soft: #5c4c44;
  --color-line: #ddccbc;
  --color-line-soft: #e8dcc9;
  --color-blush: #e6c6bd;
  --color-rose: #c68f85;
  --color-mauve: #9c747a;
  --color-burgundy: #6d3138;

  --font-display: var(--font-cormorant), Georgia, "Times New Roman", serif;
  --font-body: var(--font-jost), "Helvetica Neue", Arial, sans-serif;

  --space-1: 0.5rem;
  --space-2: 0.75rem;
  --space-3: 1.25rem;
  --space-4: 2rem;
  --space-5: 3rem;
  --space-6: 5rem;

  --width-narrow: 32rem;
  --width-wide: 46rem;

  color-scheme: light;
}

/* base element rules: *, html, body, a, h1-h3, p — see globals.css directly for the current
   full listing; key selectors relevant to design work: */

.site-header { position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  padding: var(--space-3) var(--space-4); mix-blend-mode: difference; }
.site-header__brand { font-family: var(--font-display); font-size: 1.35rem; font-style: italic;
  color: #fff; }
.site-main { flex: 1; padding: calc(var(--space-6) + 2.5rem) var(--space-4) var(--space-6); }

.page { max-width: var(--width-narrow); margin: 0 auto; }
.page--wide { max-width: var(--width-wide); }
.page__eyebrow { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2em;
  color: var(--color-mauve); }
.page__lede { color: var(--color-ink-soft); margin-top: var(--space-2); }

button, .btn { display: inline-flex; align-items: center; justify-content: center;
  justify-self: start; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.1em;
  padding: 0.75rem 1.5rem; border: 1px solid var(--color-ink); border-radius: 1px;
  background: transparent; color: var(--color-ink); }
button:hover, .btn:hover { background: var(--color-ink); color: var(--color-cream); }
.btn-primary { border-color: var(--color-burgundy); background: var(--color-burgundy);
  color: var(--color-surface); }
.btn-quiet { border-color: transparent; text-decoration: underline; }
.btn-danger { border-color: var(--color-burgundy); color: var(--color-burgundy); }

.item-row { display: flex; gap: var(--space-2); align-items: center; padding: var(--space-2) 0;
  border-bottom: 1px solid var(--color-line-soft); }
.item-row__thumb { width: 56px; height: 56px; object-fit: cover; border-radius: 1px;
  background: var(--color-cream-deep); }
.item-row__title { font-weight: 500; }
.item-row__meta { font-size: 0.85rem; color: var(--color-ink-soft); }
.item-row__price { font-family: var(--font-display); font-size: 1.1rem; }

.badge-review { font-size: 0.7rem; text-transform: uppercase; color: var(--color-mauve);
  border: 1px solid var(--color-mauve); padding: 0.15rem 0.5rem; border-radius: 1px; }
.note { border-left: 2px solid var(--color-blush); padding: var(--space-2) var(--space-3);
  background: var(--color-surface); color: var(--color-ink-soft); }

/* full file: src/app/globals.css */
```

### `src/app/page.module.css` (System B, landing page — key excerpts)

See `src/app/page.module.css` directly for the complete file (~700 lines: hero, stat grid, content
blocks, banner, phases, gallery, feature grid, footer). Token block reproduced in Part 1 above.

### Fonts

- `src/app/layout.tsx`: `Cormorant_Garamond` + `Jost` via `next/font/google`, exposed as
  `--font-cormorant` / `--font-jost`.
- `src/app/fonts.ts`: `Clash Display` via `next/font/local`, exposed as `--font-clash`, files at
  `public/fonts/clash-display/ClashDisplay-{Medium,Semibold,Bold}.woff2`.

### No Tailwind config

This project does not use Tailwind. All styling is hand-written CSS (global stylesheet +
CSS Modules for the landing page). Do not assume `tailwind.config.*` exists.
