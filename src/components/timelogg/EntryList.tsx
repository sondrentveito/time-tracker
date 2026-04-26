"use client";

import { useState } from "react";
import type { TimeEntry, WorkRulesConfig } from "@/lib/types";
import { ENTRY_TYPE_LABELS, ENTRY_TYPE_COLORS, LOCATION_LABELS } from "@/lib/types";
import { parseDate, formatDateLong, formatDuration, getExpectedHours } from "@/lib/utils";
import { useUpdateEntry, useDeleteEntry } from "@/hooks/useEntries";

interface EntryListProps {
  entries: TimeEntry[];
  rules: WorkRulesConfig;
}

function groupByDate(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const grouped = new Map<string, TimeEntry[]>();
  // Sort by date descending, then by start time descending
  const sorted = [...entries].sort((a, b) => {
    const dateCompare = parseDate(b.date).getTime() - parseDate(a.date).getTime();
    if (dateCompare !== 0) return dateCompare;
    return b.start.localeCompare(a.start);
  });
  for (const entry of sorted) {
    const group = grouped.get(entry.date) ?? [];
    group.push(entry);
    grouped.set(entry.date, group);
  }
  return grouped;
}

function DayTotal({ entries, date, rules }: { entries: TimeEntry[]; date: string; rules: WorkRulesConfig }) {
  const workHours = entries.filter((e) => e.type === "work").reduce((sum, e) => sum + e.duration, 0);
  const expected = getExpectedHours(parseDate(date), rules);
  const flex = workHours - expected;

  return (
    <div className="flex items-center gap-3 text-sm" style={{ color: "var(--fg-muted)" }}>
      <span>{formatDuration(workHours)}</span>
      {expected > 0 && (
        <span style={{ color: flex >= 0 ? "var(--ok)" : "var(--danger)" }}>
          {flex >= 0 ? "+" : ""}{formatDuration(flex)}
        </span>
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: TimeEntry }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(entry.start);
  const [end, setEnd] = useState(entry.end);
  const [note, setNote] = useState(entry.note);
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  const typeColor = ENTRY_TYPE_COLORS[entry.type];
  const typeLabel = ENTRY_TYPE_LABELS[entry.type];
  const locationLabel = LOCATION_LABELS[entry.location];

  function handleSave() {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const duration = (eh * 60 + em - sh * 60 - sm) / 60;
    updateEntry.mutate({ timestamp: entry.timestamp, start, end, duration, note });
    setEditing(false);
  }

  function handleDelete() {
    if (confirm("Slette denne registreringen?")) {
      deleteEntry.mutate(entry.timestamp);
    }
  }

  if (editing) {
    return (
      <div className="glass-card p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--fg-muted)" }}>Start</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: "var(--fg-muted)" }}>Slutt</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input w-full" />
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: "var(--fg-muted)" }}>Notat</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="input w-full" placeholder="Valgfritt notat" />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setEditing(false)} className="btn-secondary text-sm">Avbryt</button>
          <button onClick={handleSave} className="btn-primary text-sm">Lagre</button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="text-sm font-medium whitespace-nowrap">
          {entry.start} – {entry.end}
        </div>
        <div className="text-sm" style={{ color: "var(--fg-muted)" }}>
          {formatDuration(entry.duration)}
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
          style={{ backgroundColor: typeColor + "22", color: typeColor }}
        >
          {typeLabel}
        </span>
        <span className="text-xs shrink-0" style={{ color: "var(--fg-faint)" }}>
          {locationLabel}
        </span>
        {entry.note && (
          <span className="text-xs truncate" style={{ color: "var(--fg-muted)" }}>
            {entry.note}
          </span>
        )}
        {entry.auto && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            auto
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "var(--fg-faint)" }}
          title="Rediger"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
          </svg>
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 rounded-md transition-colors"
          style={{ color: "var(--fg-faint)" }}
          title="Slett"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function EntryList({ entries, rules }: EntryListProps) {
  const grouped = groupByDate(entries);

  if (entries.length === 0) {
    return (
      <div className="glass-card p-8 text-center animate-in stagger-1">
        <p style={{ color: "var(--fg-muted)" }}>Ingen registreringer enda.</p>
        <p className="text-xs mt-2" style={{ color: "var(--fg-faint)" }}>Klikk &quot;Ny registrering&quot; for a legge til.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([date, dayEntries], i) => (
        <section key={date} className={`space-y-2 animate-in stagger-${Math.min(i + 1, 6)}`}>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium" style={{ color: "var(--fg-secondary)" }}>
              {formatDateLong(parseDate(date))}
            </h2>
            <DayTotal entries={dayEntries} date={date} rules={rules} />
          </div>
          <div className="space-y-2">
            {dayEntries.map((entry) => (
              <EntryRow key={entry.timestamp} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
