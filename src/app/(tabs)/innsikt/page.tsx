"use client";

import { useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { useWorkRules } from "@/hooks/useConfig";
import {
  filterEntriesByPeriod,
  formatDuration,
  getExpectedHours,
  getMonthName,
  getWeekNumber,
  parseDate,
  calculateFlexBalance,
  type PeriodType,
} from "@/lib/utils";
import { ENTRY_TYPE_LABELS, LOCATION_LABELS } from "@/lib/types";

export default function InnsiktPage() {
  const { entries, isLoading, error } = useEntries();
  const { rules } = useWorkRules();
  const [period, setPeriod] = useState<PeriodType>("month");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: "var(--fg-muted)" }}>Laster...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass-card p-6 text-center max-w-sm">
          <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>Kunne ikke laste innsikt</p>
          <p className="text-xs mt-2" style={{ color: "var(--fg-muted)" }}>{error.message}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-sm mt-4">
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  const filtered = filterEntriesByPeriod(entries, period);
  const workEntries = filtered.filter((e) => e.type === "work");
  const totalWork = workEntries.reduce((sum, e) => sum + e.duration, 0);
  const workDays = new Set(workEntries.map((e) => e.date)).size;
  const avgHours = workDays > 0 ? totalWork / workDays : 0;

  // Location distribution
  const locationCounts: Record<string, number> = {};
  for (const e of workEntries) {
    locationCounts[e.location] = (locationCounts[e.location] || 0) + 1;
  }

  // Type distribution
  const typeCounts: Record<string, number> = {};
  for (const e of filtered) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + e.duration;
  }

  // Earliest/latest start times
  const startTimes = workEntries.map((e) => e.start).sort();
  const earliestStart = startTimes[0] || "--:--";
  const latestStart = startTimes[startTimes.length - 1] || "--:--";

  // Average start time
  const avgStartMinutes = workEntries.length > 0
    ? workEntries.reduce((sum, e) => {
        const [h, m] = e.start.split(":").map(Number);
        return sum + h * 60 + m;
      }, 0) / workEntries.length
    : 0;
  const avgStartHour = Math.floor(avgStartMinutes / 60);
  const avgStartMin = Math.round(avgStartMinutes % 60);
  const avgStart = `${avgStartHour.toString().padStart(2, "0")}:${avgStartMin.toString().padStart(2, "0")}`;

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-in">
        <h1 className="text-xl font-semibold">Innsikt</h1>
        <div className="segment-control">
          {(["week", "month", "year"] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`segment-btn ${period === p ? "active" : ""}`}
            >
              {p === "week" ? "Uke" : p === "month" ? "Måned" : "År"}
            </button>
          ))}
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in stagger-1">
        {[
          { label: "Arbeidsdager", value: workDays.toString() },
          { label: "Totalt arbeidet", value: formatDuration(totalWork) },
          { label: "Snitt per dag", value: formatDuration(avgHours) },
          { label: "Snitt start", value: avgStart },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Start time range */}
      <div className="glass-card p-5 animate-in stagger-2">
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--fg-muted)" }}>Arbeidstid-monster</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium tabular-nums">{earliestStart}</p>
            <p className="text-[11px]" style={{ color: "var(--fg-faint)" }}>Tidligst start</p>
          </div>
          <div>
            <p className="text-sm font-medium tabular-nums">{avgStart}</p>
            <p className="text-[11px]" style={{ color: "var(--fg-faint)" }}>Snitt start</p>
          </div>
          <div>
            <p className="text-sm font-medium tabular-nums">{latestStart}</p>
            <p className="text-[11px]" style={{ color: "var(--fg-faint)" }}>Senest start</p>
          </div>
        </div>
      </div>

      {/* Location distribution */}
      <div className="glass-card p-5 animate-in stagger-3">
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--fg-muted)" }}>Sted-fordeling</h2>
        <div className="space-y-2">
          {Object.entries(locationCounts).map(([loc, count]) => {
            const pct = workDays > 0 ? (count / workDays) * 100 : 0;
            return (
              <div key={loc} className="flex items-center gap-3">
                <span className="text-xs w-24" style={{ color: "var(--fg-secondary)" }}>
                  {LOCATION_LABELS[loc as keyof typeof LOCATION_LABELS] || loc}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: "var(--accent)" }}
                  />
                </div>
                <span className="text-xs tabular-nums w-12 text-right" style={{ color: "var(--fg-muted)" }}>
                  {count}d
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Type hours */}
      <div className="glass-card p-5 animate-in stagger-4">
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--fg-muted)" }}>Timer per type</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(typeCounts).map(([type, hours]) => (
            <div key={type} className="p-3 rounded-xl" style={{ background: "var(--input-bg)" }}>
              <p className="text-sm font-medium tabular-nums">{formatDuration(hours)}</p>
              <p className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
                {ENTRY_TYPE_LABELS[type as keyof typeof ENTRY_TYPE_LABELS] || type}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
