"use client";

import { useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { useChartTheme } from "@/lib/chartTheme";
import {
  filterEntriesByPeriod,
  formatDuration,
  type PeriodType,
} from "@/lib/utils";
import { ENTRY_TYPE_LABELS, LOCATION_LABELS } from "@/lib/types";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function InnsiktPage() {
  const { entries, isLoading, error } = useEntries();
  const [period, setPeriod] = useState<PeriodType>("month");
  const theme = useChartTheme();

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5">
        <div className="w-32 h-8 skeleton rounded-md mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card h-24 skeleton"></div>
          <div className="glass-card h-24 skeleton"></div>
          <div className="glass-card h-24 skeleton"></div>
        </div>
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

  const locationCounts: Record<string, number> = {};
  for (const e of workEntries) {
    locationCounts[e.location] = (locationCounts[e.location] || 0) + 1;
  }

  const typeCounts: Record<string, number> = {};
  for (const e of filtered) {
    typeCounts[e.type] = (typeCounts[e.type] || 0) + e.duration;
  }

  const typeData = Object.entries(typeCounts).map(([type, hours]) => {
    let color = theme.fgMuted;
    if (type === "work") color = theme.accent;
    if (type === "time-off") color = theme.ok;
    if (type === "vacation") color = theme.warn;
    if (type === "sick") color = theme.danger;

    return {
      name: ENTRY_TYPE_LABELS[type as keyof typeof ENTRY_TYPE_LABELS] || type,
      hours,
      color
    };
  }).filter(d => d.hours > 0);

  const startTimes = workEntries.map((e) => e.start).sort();
  const earliestStart = startTimes[0] || "--:--";
  const latestStart = startTimes[startTimes.length - 1] || "--:--";

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
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5 pb-nav">
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in stagger-1">
        {[
          { label: "Arbeidsdager", value: workDays.toString() },
          { label: "Totalt arbeidet", value: formatDuration(totalWork) },
          { label: "Snitt per dag", value: formatDuration(avgHours) },
          { label: "Snitt start", value: avgStart },
        ].map((stat) => (
          <div key={stat.label} className="glass-card-interactive p-4 rounded-2xl">
            <p className="text-lg font-semibold tabular-nums tracking-tight">{stat.value}</p>
            <p className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="glass-card p-6 animate-in stagger-2 rounded-[24px]">
          <h2 className="text-sm font-medium mb-5" style={{ color: "var(--fg-muted)" }}>Arbeidstid-monster</h2>
          <div className="grid grid-cols-3 gap-4 h-full content-center pb-4">
            <div>
              <p className="text-xl font-semibold tabular-nums tracking-tight">{earliestStart}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>Tidligst start</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums tracking-tight" style={{ color: "var(--accent)" }}>{avgStart}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>Snitt start</p>
            </div>
            <div>
              <p className="text-xl font-semibold tabular-nums tracking-tight">{latestStart}</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>Senest start</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 animate-in stagger-3 rounded-[24px]">
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--fg-muted)" }}>Timer per type</h2>
          {typeData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={52}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number | string | readonly (number | string)[] | undefined) => [
                        formatDuration(Number(Array.isArray(value) ? value[0] : value ?? 0)),
                        "Timer",
                      ]}
                      contentStyle={{ 
                        background: theme.cardBg, 
                        border: `1px solid ${theme.cardBorder}`, 
                        borderRadius: '12px',
                        backdropFilter: 'blur(12px)',
                        fontSize: '13px'
                      }}
                      itemStyle={{ color: theme.fg }}
                      labelStyle={{ color: theme.fgMuted, marginBottom: '4px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-3">
                {typeData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-xs font-medium" style={{ color: "var(--fg-secondary)" }}>{d.name}</span>
                    </div>
                    <span className="text-sm tabular-nums tracking-tight">{formatDuration(d.hours)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--fg-faint)" }}>Ingen data i perioden</p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-6 animate-in stagger-4 rounded-[24px]">
        <h2 className="text-sm font-medium mb-5" style={{ color: "var(--fg-muted)" }}>Sted-fordeling</h2>
        <div className="space-y-4">
          {Object.entries(locationCounts).map(([loc, count]) => {
            const pct = workDays > 0 ? (count / workDays) * 100 : 0;
            return (
              <div key={loc} className="flex items-center gap-4">
                <span className="text-xs font-medium w-28 shrink-0" style={{ color: "var(--fg-secondary)" }}>
                  {LOCATION_LABELS[loc as keyof typeof LOCATION_LABELS] || loc}
                </span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--input-bg)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: "var(--accent)" }}
                  />
                </div>
                <span className="text-sm font-medium tabular-nums tracking-tight w-16 text-right" style={{ color: "var(--fg)" }}>
                  {count} d
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
