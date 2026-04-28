"use client";

import { useEntries } from "@/hooks/useEntries";
import { useWorkRules, useFlexBalance } from "@/hooks/useConfig";
import OverviewHero from "@/components/dashboard/OverviewHero";
import WorkdayAssistant from "@/components/dashboard/WorkdayAssistant";
import WeekOverview from "@/components/dashboard/WeekOverview";

export default function DashboardPage() {
  const { entries, isLoading, error } = useEntries();
  const { rules } = useWorkRules();
  const { config: flexConfig } = useFlexBalance();

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
          <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>Kunne ikke laste data</p>
          <p className="text-xs mt-2" style={{ color: "var(--fg-muted)" }}>{error.message}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-sm mt-4">
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-5">
      <OverviewHero entries={entries} rules={rules} flexConfig={flexConfig} />
      <WorkdayAssistant entries={entries} rules={rules} />
      <WeekOverview entries={entries} rules={rules} />
    </div>
  );
}
