"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The landing page and sign-in are public, so they carry no app navigation.
function isPublicPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/login";
}

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/considering", label: "Considering" },
] as const;

const PAUSE_HREF = "/desired-items/new";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ initials }: { initials: string | null }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const showNav = initials !== null && !isPublicPath(pathname);

  return (
    <header className={`site-header${isLanding ? " site-header--overlay" : ""}`}>
      <div className="site-header__inner">
        {/* Signed-in pages keep the logo inside the app; only the landing page and
            signed-out visitors go to "/". */}
        <Link href={initials !== null && !isLanding ? "/dashboard" : "/"} className="site-header__brand">
          PAUSE.
        </Link>

        {showNav && (
          <nav className="site-nav" aria-label="Primary">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="site-nav__link"
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="site-header__account">
          {showNav && (
            <Link href={PAUSE_HREF} className="btn btn-primary site-header__cta">
              Pause a purchase
            </Link>
          )}
          {initials !== null ? (
            <>
              {isLanding && (
                <Link href="/dashboard" className="site-header__link">
                  Open app
                </Link>
              )}
              <Link
                href="/account"
                className="avatar"
                aria-label="Account"
                aria-current={isActive(pathname, "/account") ? "page" : undefined}
              >
                {initials}
              </Link>
            </>
          ) : (
            pathname !== "/login" && (
              <Link href="/login" className="site-header__link">
                Sign in
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}

// Home · Wardrobe · (+) Pause a purchase · Considering
export function SiteTabBar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (!signedIn || isPublicPath(pathname)) return null;

  return (
    <nav className="tab-bar" aria-label="Primary">
      <Link href="/dashboard" className="tab-bar__item" aria-current={isActive(pathname, "/dashboard") ? "page" : undefined}>
        Home
      </Link>
      <Link href="/wardrobe" className="tab-bar__item" aria-current={isActive(pathname, "/wardrobe") ? "page" : undefined}>
        Wardrobe
      </Link>
      <Link href={PAUSE_HREF} className="tab-bar__item tab-bar__item--pause">
        <span className="tab-bar__plus" aria-hidden="true">
          +
        </span>
        Pause a purchase
      </Link>
      <Link
        href="/considering"
        className="tab-bar__item"
        aria-current={isActive(pathname, "/considering") ? "page" : undefined}
      >
        Considering
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
