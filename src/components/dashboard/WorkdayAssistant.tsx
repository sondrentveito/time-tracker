"use client";

import { useEffect, useState } from "react";
import { useCreateEntry } from "@/hooks/useEntries";
import type { TimeEntry, WorkRulesConfig } from "@/lib/types";
import {
  addMinutesToTime,
  calculateEntryDuration,
  formatDate,
  formatDuration,
  getExpectedHours,
  getLunchMinutes,
} from "@/lib/utils";

interface WorkdayAssistantProps {
  entries: TimeEntry[];
  rules: WorkRulesConfig;
}

const PROMPT_AFTER_MINUTES = 8 * 60 + 5;

export default function WorkdayAssistant({ entries, rules }: WorkdayAssistantProps) {
  const createEntry = useCreateEntry();
  const [now, setNow] = useState(() => new Date());
  const [customStart, setCustomStart] = useState("08:00");
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const date = formatDate(today);
  const expected = getExpectedHours(today, rules);
  const hasEntriesToday = entries.some((entry) => entry.date === date);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const storageKey = `workday-assistant:${date}`;
  const dismissed = typeof window !== "undefined" && window.localStorage.getItem(storageKey) === "dismissed";
  const shouldPrompt = expected > 0 && !hasEntriesToday && !dismissed && minutesNow >= PROMPT_AFTER_MINUTES;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function dismiss() {
    window.localStorage.setItem(storageKey, "dismissed");
    setNow(new Date());
  }

  async function createWorkday(start: string) {
    setError(null);
    const end = addMinutesToTime(start, Math.round(expected * 60 + getLunchMinutes(rules)));
    const duration = calculateEntryDuration(start, end, "work", rules);

    try {
      await createEntry.mutateAsync({
        date,
        start,
        end,
        duration,
        type: "work",
        location: "home",
        note: "Hjemmekontor",
        auto: true,
      });
      dismiss();
    } catch {
      setError("Kunne ikke opprette arbeidsdagen. Prøv igjen.");
    }
  }

  if (!shouldPrompt) return null;

  const suggestedEnd = addMinutesToTime(customStart, Math.round(expected * 60 + getLunchMinutes(rules)));
  const suggestedDuration = calculateEntryDuration(customStart, suggestedEnd, "work", rules);

  return (
    <>
      <style>{`
        @keyframes assistantEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn-primary-glow {
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
        }
        .btn-primary-glow:hover {
          box-shadow: 0 4px 20px -2px var(--accent-soft), 0 0 0 1px var(--accent);
          transform: translateY(-1px);
        }
      `}</style>
      <section 
        className="glass-card p-4 md:p-5" 
        style={{ 
          animation: "assistantEnter 300ms ease-out both",
          border: "1px solid var(--accent-soft)"
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              Jobber du hjemme i dag?
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "var(--accent)" }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "var(--accent)" }}></span>
              </span>
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--fg-muted)" }}>
              Ingen arbeidsdag er logget. Forslaget blir {customStart}-{suggestedEnd}, <span className="tabular-nums font-medium tracking-tight" style={{ color: "var(--fg-secondary)" }}>{formatDuration(suggestedDuration)}</span> netto.
            </p>
            {error && <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              className="input h-10 w-28 tabular-nums tracking-tight"
              aria-label="Starttid"
            />
            <button className="btn-primary btn-primary-glow h-10 px-4" onClick={() => createWorkday(customStart)} disabled={createEntry.isPending}>
              Logg dagen
            </button>
            <button className="btn-secondary h-10 px-4" onClick={() => createWorkday(formatDateTime(now))} disabled={createEntry.isPending}>
              Start nå
            </button>
            <button className="h-10 px-2 text-xs transition-colors hover:text-fg" style={{ color: "var(--fg-faint)" }} onClick={dismiss}>
              Ikke i dag
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function formatDateTime(date: Date): string {
  return date.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
}
