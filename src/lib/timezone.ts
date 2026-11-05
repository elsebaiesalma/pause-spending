// The browser's time zone, remembered in a cookie so the server can read the
// month the way the person's own clock does. Months are stored in UTC, and the
// server runs in UTC, so without this "this month" flips hours early or late.
export const TIMEZONE_COOKIE = "pause_tz";
