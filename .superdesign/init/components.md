# Components

This app has **no separate component-primitive files** (no `Button.tsx`, `Card.tsx`, `Input.tsx`,
etc.). Every page is one file: inline JSX, styled by shared class names defined once in
`src/app/globals.css` (System A) or, for the landing page only, `src/app/page.module.css` (System B).
The class-name vocabulary below is the de facto component library — treat each as a reusable design
primitive when generating new pages/drafts, not as a one-off page-specific style.

## System A primitives (globals.css — used by all app pages)

| Class | Role | Notes |
|---|---|---|
| `.page` / `.page--wide` | page container | `max-width: 32rem` / `46rem`, centered |
| `.page__eyebrow` | small caps label above an h1 | uppercase, `--color-mauve`, tracked |
| `.page__lede` | intro paragraph under an h1 | `--color-ink-soft` |
| `.btn` | default button/link-button | outline style, ink border, inverts on hover |
| `.btn-primary` | primary CTA | filled burgundy |
| `.btn-quiet` | tertiary/text action | no border, underline |
| `.btn-danger` | destructive action | burgundy outline + text, not filled |
| `.item-row` / `.item-row__thumb` / `.item-row__title` / `.item-row__meta` / `.item-row__price` | a single list row for any item (wardrobe, purchase, wishlist, waiting) | flex row: thumb, title+meta stack, price on trailing edge |
| `.badge-review` | small status tag | used only for `needs_review` purchases so far, but generically "attention" tag |
| `.note` | callout/aside block | left-border in blush, surface background — used for disclaimers, empty-states, the pause-screen redundancy pull-quote |
| `.row` | horizontal button/action group | flex, gap |
| `.stack` | vertical spacing group | flex column, gap |
| `.divider` | horizontal rule | `--color-line` |
| `.nav-links` | a row of plain text nav links | used on `/dashboard` for Purchase history / Wardrobe / Budget / Wishlist |
| `input`, plain `<form>` | form fields | no dedicated `.input` class — bare `<input>`/`<select>`/`<textarea>` styled by element selector in globals.css |

## System B primitives (page.module.css — landing page only)

The landing page defines its own scoped equivalents via CSS Modules rather than reusing System A
(different visual language, white/pink instead of cream/burgundy): hero/eyebrow/heading classes,
`.statGrid`/`.stat`, `.bannerCard`, `.phase` (x3, the Confirm/Reflect/Decide mechanism steps),
gallery card classes, `.featurePoint` (x3, the sync-section feature list), and `.footer`/
`.footerInner`/`.footerCta`/`.ghostMark`. These are landing-page-specific, not shared across the app,
and are restated generically (non-scoped) in `mockups/design-system.css` as `.card`, `.stat-grid`/
`.stat`, `.nav-grid`/`.nav-link`, `.badge`, `.btn-primary`/`.btn-ghost` for the 6 standalone mockups.

## What does NOT exist

- No shared `<Header>`/`<Footer>`/`<Nav>` component — the header is inlined once in `layout.tsx`
  (see `layouts.md`); pages that need in-page nav or a footer write it inline themselves.
- No design-system/component library package, no Storybook, no shadcn/Radix primitives.
- No shared `<Button>`/`<Input>`/`<Card>` React components — styling is done entirely through the
  class names above applied to plain HTML elements.
