"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FlexBalanceConfig, TimeEntry, WorkRulesConfig } from "@/lib/types";
import {
  calculateFlexBalance,
  filterEntriesByPeriod,
  formatDuration,
  getExpectedHours,
  isToday,
} from "@/lib/utils";

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

function AnimatedHours({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800;
    const startValue = 0;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = easeOutCubic(progress);
      setDisplayValue(startValue + (value - startValue) * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(step);
  }, [value]);

  return <span className="tabular-nums tracking-tight">{formatDuration(displayValue)}</span>;
}

interface OverviewHeroProps {
  entries: TimeEntry[];
  rules: WorkRulesConfig;
  flexConfig: FlexBalanceConfig;
}

export default function OverviewHero({ entries, rules, flexConfig }: OverviewHeroProps) {
  const today = new Date();
  const todayEntries = entries.filter((entry) => isToday(entry.date));
  const workEntries = todayEntries.filter((entry) => entry.type === "work");
  const expectedToday = getExpectedHours(today, rules);
  const workedToday = workEntries.reduce((sum, entry) => sum + entry.duration, 0);
  const progress = expectedToday > 0 ? Math.min(workedToday / expectedToday, 1) : 0;
  const firstStart = workEntries.length > 0
    ? workEntries.reduce((min, entry) => (entry.start < min ? entry.start : min), workEntries[0].start)
    : null;
  const lastEnd = workEntries.length > 0
    ? workEntries.reduce((max, entry) => (entry.end > max ? entry.end : max), workEntries[0].end)
    : null;
  const balance = calculateFlexBalance(entries, rules, flexConfig.startBalance, flexConfig.startDate);
  const weekEntries = filterEntriesByPeriod(entries, "week", today).filter((entry) => entry.type === "work");
  const weekHours = weekEntries.reduce((sum, entry) => sum + entry.duration, 0);
  const todayLabel = today.toLocaleDateString("nb-NO", { weekday: "long", day: "numeric", month: "long" });

  const pastDaysEntries = weekEntries.filter(e => !isToday(e.date));
  const uniquePastDays = new Set(pastDaysEntries.map(e => e.date)).size;
  const pastHours = pastDaysEntries.reduce((sum, e) => sum + e.duration, 0);
  const weekAvg = uniquePastDays > 0 ? pastHours / uniquePastDays : expectedToday;
  const isAboveAvg = workedToday > weekAvg && workedToday > 0;
  const isBelowAvg = workedToday < weekAvg && workedToday > 0;

  return (
    <section
      className="relative overflow-hidden rounded-[28px] p-6 md:p-8 animate-in"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[28px]">
        <div
          className="absolute -right-20 -top-24 h-72 w-72 rounded-full"
          style={{ 
            background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", 
            opacity: 0.15,
            filter: "blur(60px)" 
          }}
        />
        <div
          className="absolute -left-20 top-24 h-96 w-96 rounded-full"
          style={{ 
            background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", 
            opacity: 0.08,
            filter: "blur(80px)" 
          }}
        />
      </div>

      <div className="relative z-10 grid gap-8 md:grid-cols-[1.35fr_0.9fr] md:items-end">
        <div className="space-y-6">
          <div>
            <p className="text-sm capitalize" style={{ color: "var(--fg-muted)" }}>{todayLabel}</p>
            <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight tabular-nums">
              {workEntries.length > 0 ? `${firstStart} - ${lastEnd}` : expectedToday > 0 ? "Ikke startet" : "Fri dag"}
            </h1>
            <p className="mt-3 text-sm md:text-base flex items-center gap-2" style={{ color: "var(--fg-secondary)" }}>
              {workEntries.length > 0 ? (
                <>
                  <span>
                    <AnimatedHours value={workedToday} /> netto registrert i dag
                  </span>
                  {isAboveAvg && <span className="text-xs" style={{ color: "var(--ok)" }}>↑ vs snitt</span>}
                  {isBelowAvg && <span className="text-xs" style={{ color: "var(--warn)" }}>↓ vs snitt</span>}
                </>
              ) : expectedToday > 0 ? (
                "Ingen arbeidsøkt registrert ennå"
              ) : (
                "Ingen forventede timer i dag"
              )}
            </p>
          </div>

          {expectedToday > 0 && (
            <div className="max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs" style={{ color: "var(--fg-muted)" }}>
                <span>Dagens mål</span>
                <span><AnimatedHours value={workedToday} /> / {formatDuration(expectedToday)}</span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full" style={{ background: "var(--input-bg)" }}>
                <div
                  className="relative h-full rounded-full transition-all duration-500 overflow-hidden"
                  style={{
                    width: `${progress * 100}%`,
                    background: workedToday >= expectedToday ? "var(--ok)" : "var(--accent)",
                  }}
                >
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3) 50%, transparent)",
                      animation: "shimmer 2.5s infinite ease-in-out"
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href="/timelogg" className="btn-primary">
              Åpne timelogg
            </Link>
            <Link href="/innsikt" className="btn-secondary">
              Se innsikt
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:grid-cols-1 md:gap-3">
          <Metric label="Fleks" value={<AnimatedHours value={balance} />} prefix={balance > 0 ? "+" : ""} color={balance < 0 ? "var(--danger)" : balance > 0 ? "var(--ok)" : undefined} />
          <Metric label="Denne uken" value={<AnimatedHours value={weekHours} />} />
          <Metric label="Lunsjtrekk" value={`${rules.lunchMinutes ?? 0}m`} />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, prefix, color }: { label: string; value: React.ReactNode; prefix?: string; color?: string }) {
  return (
    <div
      className="rounded-2xl px-3 py-3 md:px-4 md:py-4 glass-card-interactive"
      style={{ background: "color-mix(in srgb, var(--bg) 42%, transparent)", border: "1px solid var(--divider)" }}
    >
      <p className="text-lg md:text-2xl font-semibold tabular-nums tracking-tight" style={{ color }}>
        {prefix}{value}
      </p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--fg-faint)" }}>{label}</p>
    </div>
  );
}
