"use client";

import { useEntries } from "@/hooks/useEntries";
import { useWorkRules, useFlexBalance } from "@/hooks/useConfig";
import TodayStatus from "@/components/dashboard/TodayStatus";
import WeekOverview from "@/components/dashboard/WeekOverview";
import FlexBalanceCard from "@/components/dashboard/FlexBalance";
import MonthSummary from "@/components/dashboard/MonthSummary";

export default function DashboardPage() {
  const { entries, isLoading } = useEntries();
  const { rules } = useWorkRules();
  const { config: flexConfig } = useFlexBalance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm" style={{ color: "var(--fg-muted)" }}>Laster...</div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5">
      <h1 className="text-xl font-semibold animate-in">Oversikt</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TodayStatus entries={entries} rules={rules} />
        <FlexBalanceCard entries={entries} rules={rules} flexConfig={flexConfig} />
      </div>

      <WeekOverview entries={entries} rules={rules} />
      <MonthSummary entries={entries} rules={rules} />
    </div>
  );
}
