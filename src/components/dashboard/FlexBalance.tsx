"use client";

import type { TimeEntry, WorkRulesConfig, FlexBalanceConfig } from "@/lib/types";
import { formatDuration, calculateFlexBalance } from "@/lib/utils";

interface FlexBalanceProps {
  entries: TimeEntry[];
  rules: WorkRulesConfig;
  flexConfig: FlexBalanceConfig;
}

export default function FlexBalance({ entries, rules, flexConfig }: FlexBalanceProps) {
  const balance = calculateFlexBalance(entries, rules, flexConfig.startBalance, flexConfig.startDate);
  const isPositive = balance > 0;
  const isNegative = balance < 0;
  const colorClass = isPositive ? "flex-positive" : isNegative ? "flex-negative" : "flex-neutral";

  return (
    <div className="glass-card p-5 animate-in stagger-2">
      <h2 className="text-sm font-medium mb-4" style={{ color: "var(--fg-muted)" }}>
        Avspaserings-saldo
      </h2>

      <div className="text-center py-2">
        <p className={`text-3xl font-bold tabular-nums ${colorClass}`}>
          {isPositive ? "+" : ""}{formatDuration(balance)}
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--fg-faint)" }}>
          {isPositive
            ? "Kan avspaseres"
            : isNegative
              ? "Mangler tid"
              : "I balanse"}
        </p>
      </div>

      {/* Quick stats */}
      <div className="flex justify-center gap-6 mt-4 pt-3" style={{ borderTop: "1px solid var(--divider)" }}>
        <div className="text-center">
          <p className="text-lg font-semibold tabular-nums">
            {entries.filter((e) => e.type === "work").length}
          </p>
          <p className="text-[10px]" style={{ color: "var(--fg-faint)" }}>Arbeidsdager</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold tabular-nums">
            {entries.filter((e) => e.type === "time-off").length}
          </p>
          <p className="text-[10px]" style={{ color: "var(--fg-faint)" }}>Avspasert</p>
        </div>
      </div>
    </div>
  );
}
