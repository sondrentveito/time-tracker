"use client";

import Link from "next/link";
import type { FlexBalanceConfig, TimeEntry, WorkRulesConfig } from "@/lib/types";
import {
  calculateFlexBalance,
  filterEntriesByPeriod,
  formatDuration,
  getExpectedHours,
  isToday,
} from "@/lib/utils";

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

  return (
    <section
      className="relative overflow-hidden rounded-[28px] p-6 md:p-8 animate-in"
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 28%, var(--bg-secondary)) 0%, var(--bg-secondary) 58%, var(--card-bg) 100%)",
        border: "1px solid var(--card-border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="absolute -right-20 -top-24 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "color-mix(in srgb, var(--accent) 32%, transparent)" }}
      />

      <div className="relative grid gap-8 md:grid-cols-[1.35fr_0.9fr] md:items-end">
        <div className="space-y-6">
          <div>
            <p className="text-sm capitalize" style={{ color: "var(--fg-muted)" }}>{todayLabel}</p>
            <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight">
              {workEntries.length > 0 ? `${firstStart} - ${lastEnd}` : expectedToday > 0 ? "Ikke startet" : "Fri dag"}
            </h1>
            <p className="mt-3 text-sm md:text-base" style={{ color: "var(--fg-secondary)" }}>
              {workEntries.length > 0
                ? `${formatDuration(workedToday)} netto registrert i dag`
                : expectedToday > 0
                  ? "Ingen arbeidsøkt registrert ennå"
                  : "Ingen forventede timer i dag"}
            </p>
          </div>

          {expectedToday > 0 && (
            <div className="max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs" style={{ color: "var(--fg-muted)" }}>
                <span>Dagens mål</span>
                <span>{formatDuration(workedToday)} / {formatDuration(expectedToday)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full" style={{ background: "var(--input-bg)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress * 100}%`,
                    background: workedToday >= expectedToday ? "var(--ok)" : "var(--accent)",
                  }}
                />
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
          <Metric label="Fleks" value={`${balance > 0 ? "+" : ""}${formatDuration(balance)}`} color={balance < 0 ? "var(--danger)" : balance > 0 ? "var(--ok)" : undefined} />
          <Metric label="Denne uken" value={formatDuration(weekHours)} />
          <Metric label="Lunsjtrekk" value={`${rules.lunchMinutes ?? 0}m`} />
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="rounded-2xl px-3 py-3 md:px-4 md:py-4"
      style={{ background: "color-mix(in srgb, var(--bg) 42%, transparent)", border: "1px solid var(--divider)" }}
    >
      <p className="text-lg md:text-2xl font-semibold tabular-nums" style={{ color }}>{value}</p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--fg-faint)" }}>{label}</p>
    </div>
  );
}
