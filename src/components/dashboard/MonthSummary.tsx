"use client";

import type { TimeEntry, WorkRulesConfig } from "@/lib/types";
import { filterEntriesByPeriod, getExpectedHours, formatDuration, getMonthName } from "@/lib/utils";

interface MonthSummaryProps {
  entries: TimeEntry[];
  rules: WorkRulesConfig;
}

export default function MonthSummary({ entries, rules }: MonthSummaryProps) {
  const now = new Date();
  const monthEntries = filterEntriesByPeriod(entries, "month", now);
  const monthName = getMonthName(now);

  // Calculate working days in current month (up to today)
  const year = now.getFullYear();
  const month = now.getMonth();
  let expectedTotal = 0;
  const today = now.getDate();

  for (let d = 1; d <= today; d++) {
    const date = new Date(year, month, d);
    expectedTotal += getExpectedHours(date, rules);
  }

  const workHours = monthEntries
    .filter((e) => e.type === "work")
    .reduce((sum, e) => sum + e.duration, 0);

  const timeOffHours = monthEntries
    .filter((e) => e.type === "time-off")
    .reduce((sum, e) => sum + e.duration, 0);

  const sickDays = new Set(
    monthEntries.filter((e) => e.type === "sick").map((e) => e.date)
  ).size;

  const vacationDays = new Set(
    monthEntries.filter((e) => e.type === "vacation").map((e) => e.date)
  ).size;

  const workDays = new Set(
    monthEntries.filter((e) => e.type === "work").map((e) => e.date)
  ).size;

  const flex = workHours - expectedTotal;

  const stats = [
    { label: "Arbeidsdager", value: workDays.toString() },
    { label: "Arbeidet", value: formatDuration(workHours) },
    { label: "Forventet", value: formatDuration(expectedTotal) },
    {
      label: "Flex",
      value: (flex >= 0 ? "+" : "") + formatDuration(flex),
      color: flex >= 0 ? "var(--ok)" : "var(--danger)",
    },
    { label: "Avspasert", value: formatDuration(timeOffHours), color: "var(--ok)" },
    { label: "Syk", value: `${sickDays}d`, color: "var(--danger)" },
    { label: "Ferie", value: `${vacationDays}d`, color: "var(--warn)" },
  ];

  return (
    <div className="glass-card p-5 animate-in stagger-4">
      <h2 className="text-sm font-medium mb-4" style={{ color: "var(--fg-muted)" }}>
        {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {year}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p
              className="text-lg font-semibold tabular-nums"
              style={{ color: stat.color || "var(--fg)" }}
            >
              {stat.value}
            </p>
            <p className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
