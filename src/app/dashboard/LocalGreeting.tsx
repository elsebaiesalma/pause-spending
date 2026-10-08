"use client";

import { useSyncExternalStore } from "react";
import { PageHero } from "@/components/kit/PageHero";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

function partOfDay(hour: number): string {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

// Local time only exists in the browser. The server snapshot is null, so the
// server HTML holds the hero's space (hidden) and the browser fills in the
// real greeting on hydration, with no mismatch.
function subscribe() {
  return () => {};
}

function currentSnapshot(): string {
  const now = new Date();
  return `${partOfDay(now.getHours())}|${DATE_FORMAT.format(now)}`;
}

export function LocalGreeting({ firstName }: { firstName: string | null }) {
  const snapshot = useSyncExternalStore(subscribe, currentSnapshot, () => null);
  const name = firstName ? `, ${firstName}` : "";

  if (snapshot === null) {
    return <PageHero eyebrow="Today" title={`Good day${name}.`} pending />;
  }
  const [part, date] = snapshot.split("|");
  return <PageHero eyebrow={date} title={`Good ${part}${name}.`} />;
}
