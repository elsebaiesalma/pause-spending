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
