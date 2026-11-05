# Layouts

## Root layout

- File: `src/app/layout.tsx`
- Renders: fonts (Cormorant Garamond + Jost), a fixed site header, and the page content.

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pause Before Purchase",
  description: "A quiet moment before you buy - what you already own, what it costs, what else you could do instead.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable}`}>
      <body style={{ display: "flex", flexDirection: "column" }}>
        <header className="site-header">
          <a href="/" className="site-header__brand">
            Pause
          </a>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
```

## Header

There is no separate header component file — the header is inlined directly in `layout.tsx` above
(just a wordmark link, "Pause", styled via `.site-header` / `.site-header__brand` in `globals.css`).
It is `position: fixed` + `mix-blend-mode: difference`, so it renders correctly over both the cream
app pages and the white/black landing page without any per-route branching. It carries no navigation
links itself — each page provides its own in-page nav where relevant (see `pages.md`).

## No sidebar, no footer component

This app has no persistent sidebar and no shared footer component. The landing page (`/`) has its
own one-off `<footer>` defined inline in `src/app/page.tsx`, styled by `page.module.css`
(`.footer`, `.footerInner`, etc.) — it is specific to that page, not a shared layout piece.

## No nested layouts

Every route is a direct child of the root layout above (no `layout.tsx` files inside route
subfolders like `dashboard/`, `wardrobe/`, `desired-items/`, etc.).
