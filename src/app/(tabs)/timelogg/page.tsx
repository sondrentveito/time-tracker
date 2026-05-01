"use client";

import { useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { useWorkRules } from "@/hooks/useConfig";
import EntryList from "@/components/timelogg/EntryList";
import AddEntryModal from "@/components/timelogg/AddEntryModal";

export default function TimeloggPage() {
  const { entries, isLoading, error } = useEntries();
  const { rules } = useWorkRules();
  const [showAdd, setShowAdd] = useState(false);

  if (isLoading) {
    return (
      <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="w-32 h-8 skeleton rounded-md"></div>
          <div className="w-36 h-9 skeleton rounded-xl"></div>
        </div>
        <div className="space-y-3 mt-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass-card h-16 skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="glass-card p-6 text-center max-w-sm">
          <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>Kunne ikke laste timelogg</p>
          <p className="text-xs mt-2" style={{ color: "var(--fg-muted)" }}>{error.message}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-sm mt-4">
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-in">
        <h1 className="text-xl font-semibold">Timelogg</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ny registrering
        </button>
      </div>

      <EntryList entries={entries} rules={rules} />

      {showAdd && <AddEntryModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
