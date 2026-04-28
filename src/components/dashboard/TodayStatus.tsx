"use client";

import type { TimeEntry, WorkRulesConfig } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS } from "@/lib/types";
import { formatDuration, getExpectedHours, isToday } from "@/lib/utils";

interface TodayStatusProps {
  entries: TimeEntry[];
  rules: WorkRulesConfig;
}

export default function TodayStatus({ entries, rules }: TodayStatusProps) {
  const today = new Date();
  const todayEntries = entries.filter((e) => isToday(e.date));
  const workEntries = todayEntries.filter((e) => e.type === "work");
  const totalHours = workEntries.reduce((sum, e) => sum + e.duration, 0);
  const expected = getExpectedHours(today, rules);
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  const firstStart = workEntries.length > 0
    ? workEntries.reduce((min, e) => (e.start < min ? e.start : min), workEntries[0].start)
    : null;
  const lastEnd = workEntries.length > 0
    ? workEntries.reduce((max, e) => (e.end > max ? e.end : max), workEntries[0].end)
    : null;

  // Non-work entries today
  const otherEntries = todayEntries.filter((e) => e.type !== "work");

  return (
    <div className="glass-card p-5 animate-in stagger-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>I dag</h2>
        {isWeekend && (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            Helg
          </span>
        )}
      </div>

      {todayEntries.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-2xl font-semibold" style={{ color: "var(--fg-faint)" }}>--:--</p>
          <p className="text-xs mt-2" style={{ color: "var(--fg-faint)" }}>
            {isWeekend ? "Fri dag" : "Ingen registrering"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Time range */}
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{firstStart}</span>
            <span style={{ color: "var(--fg-faint)" }}>–</span>
            <span className="text-2xl font-semibold tabular-nums">{lastEnd}</span>
          </div>

          {/* Hours bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span style={{ color: "var(--fg-muted)" }}>{formatDuration(totalHours)}</span>
              {expected > 0 && (
                <span style={{ color: "var(--fg-faint)" }}>av {formatDuration(expected)}</span>
              )}
            </div>
            {expected > 0 && (
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((totalHours / expected) * 100, 100)}%`,
                    background: totalHours >= expected ? "var(--ok)" : "var(--accent)",
                  }}
                />
              </div>
            )}
          </div>

          {/* Other entry types today */}
          {otherEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {otherEntries.map((e) => (
                <span
                  key={e.timestamp}
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: ENTRY_TYPE_COLORS[e.type] + "22", color: ENTRY_TYPE_COLORS[e.type] }}
                >
                  {ENTRY_TYPE_LABELS[e.type]} {formatDuration(e.duration)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
