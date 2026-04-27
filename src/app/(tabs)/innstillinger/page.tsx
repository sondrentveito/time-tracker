"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/context/ThemeContext";
import { useWorkRules, useSaveWorkRules, useFlexBalance, useSaveFlexBalance } from "@/hooks/useConfig";
import type { WorkPeriod } from "@/lib/types";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function InnstillingerPage() {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const { rules, isLoading: rulesLoading } = useWorkRules();
  const saveRules = useSaveWorkRules();
  const { config: flexConfig, isLoading: flexLoading } = useFlexBalance();
  const saveFlexBalance = useSaveFlexBalance();

  const [defaultHours, setDefaultHours] = useState(rules.defaultHoursPerDay);
  const [periods, setPeriods] = useState<WorkPeriod[]>(rules.periods);
  const [startBalance, setStartBalance] = useState(flexConfig.startBalance);
  const [startDate, setStartDate] = useState(flexConfig.startDate);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync state when async data loads
  useEffect(() => {
    if (!rulesLoading) {
      setDefaultHours(rules.defaultHoursPerDay);
      setPeriods(rules.periods);
    }
  }, [rules, rulesLoading]);

  useEffect(() => {
    if (!flexLoading) {
      setStartBalance(flexConfig.startBalance);
      setStartDate(flexConfig.startDate);
    }
  }, [flexConfig, flexLoading]);

  function addPeriod() {
    setPeriods([...periods, { id: generateId(), from: "05-15", to: "08-31", hoursPerDay: 7, label: "" }]);
  }

  function removePeriod(id: string) {
    setPeriods(periods.filter((p) => p.id !== id));
  }

  function updatePeriod(id: string, updates: Partial<WorkPeriod>) {
    setPeriods(periods.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  async function handleSave() {
    setSaveError(null);
    try {
      await Promise.all([
        saveRules.mutateAsync({ defaultHoursPerDay: defaultHours, periods }),
        saveFlexBalance.mutateAsync({ startBalance, startDate }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Kunne ikke lagre innstillingene. Prøv igjen.");
    }
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold animate-in">Innstillinger</h1>

      {/* Work Rules */}
      <div className="glass-card p-5 space-y-4 animate-in stagger-1">
        <h2 className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>Arbeidstid</h2>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>
            Standard timer per dag
          </label>
          <input
            type="number"
            step="0.5"
            value={defaultHours}
            onChange={(e) => setDefaultHours(parseFloat(e.target.value) || 0)}
            className="input w-32"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium" style={{ color: "var(--fg-muted)" }}>
              Perioder med avvikende tid
            </label>
            <button onClick={addPeriod} className="text-xs" style={{ color: "var(--accent)" }}>
              + Legg til periode
            </button>
          </div>

          {periods.map((period) => (
            <div key={period.id} className="p-3 rounded-xl space-y-2" style={{ background: "var(--input-bg)", border: "1px solid var(--input-border)" }}>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={period.label}
                  onChange={(e) => updatePeriod(period.id, { label: e.target.value })}
                  placeholder="Navn (f.eks. Sommertid)"
                  className="input flex-1 mr-2"
                  style={{ background: "transparent", border: "none", padding: "4px 0" }}
                />
                <button onClick={() => removePeriod(period.id)} style={{ color: "var(--danger)" }} className="text-xs">
                  Fjern
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: "var(--fg-faint)" }}>Fra (MM-DD)</label>
                  <input
                    type="text"
                    value={period.from}
                    onChange={(e) => updatePeriod(period.id, { from: e.target.value })}
                    className="input w-full text-sm"
                    placeholder="05-15"
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: "var(--fg-faint)" }}>Til (MM-DD)</label>
                  <input
                    type="text"
                    value={period.to}
                    onChange={(e) => updatePeriod(period.id, { to: e.target.value })}
                    className="input w-full text-sm"
                    placeholder="08-31"
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-0.5" style={{ color: "var(--fg-faint)" }}>Timer/dag</label>
                  <input
                    type="number"
                    step="0.5"
                    value={period.hoursPerDay}
                    onChange={(e) => updatePeriod(period.id, { hoursPerDay: parseFloat(e.target.value) || 0 })}
                    className="input w-full text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Flex Balance Start */}
      <div className="glass-card p-5 space-y-4 animate-in stagger-2">
        <h2 className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>Fleks-saldo</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>
              Startsaldo (timer)
            </label>
            <input
              type="number"
              step="0.5"
              value={startBalance}
              onChange={(e) => setStartBalance(parseFloat(e.target.value) || 0)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>
              Fra dato (dd.mm.yyyy)
            </label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-full"
              placeholder="01.01.2025"
            />
          </div>
        </div>

        <p className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
          Sett startsaldo og dato for a starte beregningen fra et kjent punkt.
        </p>
      </div>

      {/* Account */}
      <div className="glass-card p-5 space-y-4 animate-in stagger-3">
        <h2 className="text-sm font-medium" style={{ color: "var(--fg-muted)" }}>Konto</h2>

        {session?.user && (
          <div className="flex items-center gap-3">
            {session.user.image && (
              <img src={session.user.image} alt="" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
            )}
            <div>
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs" style={{ color: "var(--fg-muted)" }}>{session.user.email}</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={toggle} className="btn-secondary text-sm">
            {theme === "dark" ? "Lyst tema" : "Morkt tema"}
          </button>
          <button onClick={() => signOut()} className="btn-secondary text-sm" style={{ color: "var(--danger)" }}>
            Logg ut
          </button>
        </div>
      </div>

      {/* Save button */}
      {saveError && (
        <div className="text-sm text-center p-3 rounded-xl" style={{ color: "var(--danger)", background: "var(--danger-soft, rgba(255,59,48,0.1))" }}>
          {saveError}
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saveRules.isPending || saveFlexBalance.isPending}
        className="btn-primary w-full animate-in stagger-4"
      >
        {saved ? "Lagret!" : saveRules.isPending ? "Lagrer..." : "Lagre innstillinger"}
      </button>
    </div>
  );
}
