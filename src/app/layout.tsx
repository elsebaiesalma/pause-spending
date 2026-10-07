import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import Link from "next/link";
import { clashDisplay } from "./fonts";
import { auth, signOut } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "PAUSE Before Purchase",
  description: "A quiet moment before you buy - what you already own, what it costs, what else you could do instead.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html lang="en" className={`${clashDisplay.variable} ${inter.variable} ${spaceMono.variable}`}>
      {/* suppressHydrationWarning: browser extensions (Grammarly, password
          managers, etc.) inject their own data-* attributes onto <body>
          before React hydrates - a real, harmless mismatch that isn't
          caused by anything in this app. Scoped to this one element only;
          it does not suppress mismatches in children. */}
      <body style={{ display: "flex", flexDirection: "column" }} suppressHydrationWarning>
        <header className="site-header">
          <Link href="/" className="site-header__brand">
            PAUSE.
          </Link>
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
              className="site-header__account"
            >
              <span className="site-header__email">{session.user.email}</span>
              <button type="submit" className="btn-quiet">
                Sign out
              </button>
            </form>
          ) : (
            <a href="/login" className="site-header__account btn-quiet">
              Sign in
            </a>
          )}
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
