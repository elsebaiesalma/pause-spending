"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DemoButton } from "@/components/DemoButton";
import { StartOverButton } from "@/components/StartOverButton";

// The landing page and sign-in are public, so they carry no app navigation.
function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/login";
}

// Three destinations plus the Pause action (Polaris: few, task-shaped
// top-level items). Lookbook lives inside Closet; each item page lives
// inside Decisions.
const LINKS = [
  { href: "/dashboard", label: "Home", match: ["/dashboard"] },
  { href: "/considering", label: "Decisions", match: ["/considering", "/desired-items"] },
  { href: "/wardrobe", label: "Closet", match: ["/wardrobe", "/lookbook"] },
] as const;

const PAUSE_HREF = "/desired-items/new";

function isUnder(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Adding an item and deciding on it (confirm, pause, still want it) are the
// Pause action, not a place in Decisions, so no tab is highlighted there.
const PAUSE_FLOW = /^\/desired-items\/(new|[^/]+\/(confirm|pause|still-want-it))\/?$/;

export function isActive(pathname: string, link: (typeof LINKS)[number]): boolean {
  if (PAUSE_FLOW.test(pathname)) return false;
  return link.match.some((href) => isUnder(pathname, href));
}

type HeaderProps = {
  initials: string | null;
  isDemo: boolean;
  gmailEnabled: boolean;
  signOutAction: () => Promise<void>;
};

export function SiteHeader({ initials, isDemo, gmailEnabled, signOutAction }: HeaderProps) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const showNav = initials !== null && !isPublicPath(pathname);
  // Home has its own add box, so the header doesn't repeat the action there.
  const showCta = showNav && pathname !== "/dashboard" && pathname !== PAUSE_HREF;

  return (
    <header className={`site-header${isLanding ? " site-header--overlay" : ""}`}>
      <div className="site-header__inner">
        {/* Signed-in pages keep the logo inside the app; only the landing page and
            signed-out visitors go to "/". */}
        <Link href={initials !== null && !isLanding ? "/dashboard" : "/"} className="site-header__brand">
          PAUSE<span className="site-header__dot">.</span>
        </Link>

        {showNav && (
          <nav className="site-nav" aria-label="Primary">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="site-nav__link"
                aria-current={isActive(pathname, link) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="site-header__account">
          {showCta && (
            <Link href={PAUSE_HREF} className="btn site-header__cta">
              Pause a purchase
            </Link>
          )}
          {isLanding && !gmailEnabled ? (
            // The landing page always offers the demo, signed in or not.
            <>
              {initials !== null && (
                <Link href="/dashboard" className="site-header__link">
                  Open app
                </Link>
              )}
              <DemoButton label="Try the demo" pendingLabel="Setting up…" className="site-header__link" />
            </>
          ) : initials !== null ? (
            <>
              {isLanding && (
                <Link href="/dashboard" className="site-header__link">
                  Open app
                </Link>
              )}
              <AccountMenu initials={initials} isDemo={isDemo} signOutAction={signOutAction} current={isUnder(pathname, "/account") || isUnder(pathname, "/budget")} />
            </>
          ) : (
            pathname !== "/login" &&
            (gmailEnabled ? (
              <Link href="/login" className="site-header__link">
                Sign in
              </Link>
            ) : (
              // Starts the demo directly, like every other "Try the demo".
              <DemoButton label="Try the demo" pendingLabel="Setting up…" className="site-header__link" />
            ))
          )}
        </div>
      </div>
    </header>
  );
}

// The initials circle opens a small menu (Polaris user menu). A native
// <details>, so it works with a keyboard and without JavaScript; it closes
// when a link is followed because the page changes.
function AccountMenu({
  initials,
  isDemo,
  signOutAction,
  current,
}: {
  initials: string;
  isDemo: boolean;
  signOutAction: () => Promise<void>;
  current: boolean;
}) {
  const pathname = usePathname();
  return (
    <details className="account-menu" key={pathname}>
      <summary className="avatar" aria-label="Account menu" data-current={current || undefined}>
        {initials}
      </summary>
      <div className="account-menu__panel" role="menu">
        <Link href="/account" className="account-menu__item" role="menuitem">
          Settings
        </Link>
        <Link href="/budget" className="account-menu__item account-menu__item--sub" role="menuitem">
          Budget &amp; Goals
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="account-menu__item" role="menuitem">
            Sign out
          </button>
        </form>
        {/* Destructive, so set apart below a divider and confirmed first. */}
        {isDemo && (
          <>
            <hr className="account-menu__divider" />
            <StartOverButton
              label="Start over with a fresh closet"
              className="account-menu__item account-menu__item--danger"
              role="menuitem"
            />
          </>
        )}
      </div>
    </details>
  );
}

// Home · Decisions · (+) Pause · Closet
export function SiteTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (!signedIn || isPublicPath(pathname)) return null;
  const [home, decisions, closet] = LINKS;

  return (
    <nav className="tab-bar" aria-label="Primary">
      <Link href={home.href} className="tab-bar__item" aria-current={isActive(pathname, home) ? "page" : undefined}>
        {home.label}
      </Link>
      <Link
        href={decisions.href}
        className="tab-bar__item"
        aria-current={isActive(pathname, decisions) ? "page" : undefined}
      >
        {decisions.label}
      </Link>
      <Link
        href={PAUSE_HREF}
        className="tab-bar__item tab-bar__item--pause"
        aria-current={pathname === PAUSE_HREF ? "page" : undefined}
      >
        <span className="tab-bar__plus" aria-hidden="true">
          +
        </span>
        Pause
      </Link>
      <Link href={closet.href} className="tab-bar__item" aria-current={isActive(pathname, closet) ? "page" : undefined}>
        {closet.label}
      </Link>
    </nav>
  );
}

// Shares the page container with the header. The landing page bleeds to the
// full viewport and lays out its own sections; signed-in pages reserve room
// above the fixed bottom tab bar on phones.
export function SiteMain({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const classes = ["site-main"];
  if (pathname === "/") classes.push("site-main--bleed");
  else if (signedIn && !isPublicPath(pathname)) classes.push("site-main--tabs");
  return <main className={classes.join(" ")}>{children}</main>;
}
