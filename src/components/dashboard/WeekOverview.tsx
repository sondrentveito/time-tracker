"use client";

import type { TimeEntry, WorkRulesConfig } from "@/lib/types";
import { getWeekdays, getDayName, formatDuration, getExpectedHours, formatDate, isToday } from "@/lib/utils";

interface WeekOverviewProps {
  entries: TimeEntry[];
  rules: WorkRulesConfig;
}

export default function WeekOverview({ entries, rules }: WeekOverviewProps) {
  const weekdays = getWeekdays(new Date());

  const dayData = weekdays.map((date) => {
    const dateStr = formatDate(date);
    const dayEntries = entries.filter((e) => e.date === dateStr);
    const workHours = dayEntries.filter((e) => e.type === "work").reduce((sum, e) => sum + e.duration, 0);
    const expected = getExpectedHours(date, rules);
    const today = isToday(dateStr);

    return { date, dateStr, dayName: getDayName(date), workHours, expected, today };
  });

  const maxHours = Math.max(...dayData.map((d) => Math.max(d.workHours, d.expected)), 8);

  return (
    <div className="glass-card p-5 animate-in stagger-3">
      <h2 className="text-sm font-medium mb-5" style={{ color: "var(--fg-muted)" }}>Denne uken</h2>

      <div className="flex items-end gap-3 h-40">
        {dayData.map((day) => {
          const barHeight = maxHours > 0 ? (day.workHours / maxHours) * 100 : 0;
          const expectedHeight = maxHours > 0 ? (day.expected / maxHours) * 100 : 0;
          const isOver = day.workHours >= day.expected && day.expected > 0;
          const hasData = day.workHours > 0;

          return (
            <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2">
              {/* Hours label */}
              <span
                className="text-[11px] tabular-nums font-medium"
                style={{ color: hasData ? "var(--fg-secondary)" : "var(--fg-faint)" }}
              >
                {hasData ? formatDuration(day.workHours) : "–"}
              </span>

              {/* Bar container */}
              <div className="relative w-full flex justify-center" style={{ height: "100px" }}>
                {/* Expected line */}
                {day.expected > 0 && (
                  <div
                    className="absolute w-full"
                    style={{
                      bottom: `${expectedHeight}%`,
                      borderTop: "1.5px dashed var(--fg-faint)",
                    }}
                  />
                )}

                {/* Work bar */}
                <div
                  className="w-8 rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${barHeight}%`,
                    background: day.today
                      ? "var(--accent)"
                      : isOver
                        ? "var(--ok)"
                        : hasData
                          ? "var(--accent-soft)"
                          : "var(--input-bg)",
                    position: "absolute",
                    bottom: 0,
                  }}
                />
              </div>

              {/* Day name */}
              <span
                className="text-xs font-medium"
                style={{
                  color: day.today ? "var(--accent)" : "var(--fg-muted)",
                }}
              >
                {day.dayName}
              </span>
            </div>
          );
        })}
      </div>

      {/* Week total */}
      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid var(--divider)" }}>
        <span className="text-xs" style={{ color: "var(--fg-muted)" }}>Total denne uken</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium tabular-nums">
            {formatDuration(dayData.reduce((sum, d) => sum + d.workHours, 0))}
          </span>
          <span className="text-xs" style={{ color: "var(--fg-faint)" }}>
            / {formatDuration(dayData.reduce((sum, d) => sum + d.expected, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}
