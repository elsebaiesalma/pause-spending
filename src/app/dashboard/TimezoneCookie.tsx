"use client";

import { useEffect } from "react";
import { TIMEZONE_COOKIE } from "@/lib/timezone";

// Writes the browser's time zone to a cookie. Renders nothing. It is a
// convenience: when it is missing or blocked, the server uses UTC.
export function TimezoneCookie() {
  useEffect(() => {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone && !document.cookie.split("; ").includes(`${TIMEZONE_COOKIE}=${encodeURIComponent(zone)}`)) {
        document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {
      // No Intl or cookies: leave the server on UTC.
    }
  }, []);
  return null;
}
