# Extractable components

This codebase has exactly **one** piece of UI that is a genuine shared layout element rather than
page-local markup: the site header inlined in `src/app/layout.tsx`.

## Header (from `layout.tsx`)

```tsx
<header className="site-header">
  <a href="/" className="site-header__brand">
    Pause
  </a>
</header>
```

- Styled by `.site-header` / `.site-header__brand` in `globals.css`.
- `position: fixed; top: 0; left: 0; right: 0;` + `mix-blend-mode: difference` — this is the one
  deliberate cross-page design trick in the app: because it blends against whatever sits beneath it,
  the same header renders correctly (readable, inverted where needed) over both the cream System-A
  pages and the white/black System-B landing page, with zero per-route conditional styling.
- It is the ONLY thing shared by literally every route in the app (root layout, no nested layouts —
  see `layouts.md`). Any new page/draft should keep this header exactly as-is rather than
  reinventing a nav bar, since replacing it would break the one piece of visual continuity the site
  currently has across its two otherwise-separate design systems.
- It carries no nav links and no auth/account menu — by design, each page supplies its own in-page
  navigation (e.g. `/dashboard`'s "Purchase history / Wardrobe / Budget / Wishlist" row via
  `.nav-links`, see `components.md`).

## Everything else is page-local

No other markup is reused verbatim across more than one route. Item rows, forms, stat grids, etc.
share a common CLASS vocabulary (documented in `components.md`) but each page authors its own JSX
instance of them — there is no `<ItemRow item={...} />`-style component to extract or reuse from an
existing file. When generating a new page, follow the same pattern: compose the shared classes,
don't invent new ones, but write the JSX structure fresh per page.
