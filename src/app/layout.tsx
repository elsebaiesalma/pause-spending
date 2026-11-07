import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import { clashDisplay } from "./fonts";
import { auth, signOut } from "@/lib/auth";
import { initialsFor } from "@/lib/initials";
import { DevViewBanner } from "@/components/DevViewBanner";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoTour } from "@/components/DemoTour";
import { isDemoEmail, isGmailEnabled } from "@/lib/demo";
import { SiteHeader, SiteMain, SiteTabBar } from "@/components/SiteNav";
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
  const initials = session?.user ? initialsFor(session.user.name, session.user.email) : null;
  const isDemo = isDemoEmail(session?.user?.email);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <html lang="en" className={`${clashDisplay.variable} ${inter.variable} ${spaceMono.variable}`}>
      {/* suppressHydrationWarning: browser extensions (Grammarly, password
          managers, etc.) inject their own data-* attributes onto <body>
          before React hydrates - a real, harmless mismatch that isn't
          caused by anything in this app. Scoped to this one element only;
          it does not suppress mismatches in children. */}
      <body style={{ display: "flex", flexDirection: "column" }} suppressHydrationWarning>
        <SiteHeader initials={initials} isDemo={isDemo} gmailEnabled={isGmailEnabled()} signOutAction={signOutAction} />
        <DevViewBanner />
        {isDemo && <DemoBanner />}
        <SiteMain signedIn={initials !== null}>{children}</SiteMain>
        <SiteTabBar signedIn={initials !== null} />
        {isDemo && session?.user?.id && <DemoTour userId={session.user.id} />}
      </body>
    </html>
  );
}
