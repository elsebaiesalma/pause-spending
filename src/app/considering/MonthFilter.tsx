"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

// A native select that reloads Decisions for the chosen month, keeping the tab.
// Without script the select does nothing, and the tabs still work unfiltered.
export function MonthFilter({
  tab,
  month,
  options,
}: {
  tab: string;
  month: string | null;
  options: { key: string; label: string }[];
}) {
  const router = useRouter();
  return (
    <label className={styles.monthFilter}>
      <span>Month</span>
      <select
        value={month ?? ""}
        onChange={(event) => {
          const params = new URLSearchParams();
          if (tab !== "paused") params.set("tab", tab);
          if (event.target.value) params.set("month", event.target.value);
          const query = params.toString();
          router.push(query ? `/considering?${query}` : "/considering");
        }}
      >
        <option value="">All time</option>
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
