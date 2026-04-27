"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCreateEntry } from "@/hooks/useEntries";
import { calculateDuration, formatDate, formatDuration } from "@/lib/utils";
import { ENTRY_TYPE_LABELS, LOCATION_LABELS } from "@/lib/types";
import type { EntryType, LocationType } from "@/lib/types";

interface AddEntryModalProps {
  onClose: () => void;
}

export default function AddEntryModal({ onClose }: AddEntryModalProps) {
  const createEntry = useCreateEntry();
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const [date, setDate] = useState(formatDate(now));
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("16:00");
  const [type, setType] = useState<EntryType>("work");
  const [location, setLocation] = useState<LocationType>("office");
  const [note, setNote] = useState("");

  const duration = calculateDuration(start, end);

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus trap
  const handleFocusTrap = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !overlayRef.current) return;
    const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleFocusTrap);
    return () => window.removeEventListener("keydown", handleFocusTrap);
  }, [handleFocusTrap]);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (duration <= 0) return;

    try {
      await createEntry.mutateAsync({
        date,
        start,
        end,
        duration,
        type,
        location,
        note,
        auto: false,
      });
      onClose();
    } catch {
      setError("Kunne ikke lagre registreringen. Prøv igjen.");
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-entry-title"
    >
      <form
        onSubmit={handleSubmit}
        className="glass-card p-6 w-full max-w-md space-y-5 animate-in"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--card-border)" }}
      >
        <div className="flex items-center justify-between">
          <h2 id="add-entry-title" className="text-lg font-semibold">Ny registrering</h2>
          <button type="button" onClick={onClose} className="p-1" style={{ color: "var(--fg-muted)" }} aria-label="Lukk">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="text-sm p-3 rounded-xl" style={{ color: "var(--danger)", background: "var(--danger-soft, rgba(255,59,48,0.1))" }}>
            {error}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>Dato</label>
          <input
            ref={firstInputRef}
            type="text"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            placeholder="dd.mm.yyyy"
            className="input w-full"
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>Start</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>Slutt</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input w-full" />
          </div>
        </div>

        {/* Duration display */}
        {duration > 0 && (
          <div className="text-center text-sm" style={{ color: "var(--accent)" }}>
            {formatDuration(duration)}
          </div>
        )}

        {/* Type & Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as EntryType)}
              className="input w-full"
            >
              {Object.entries(ENTRY_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>Sted</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as LocationType)}
              className="input w-full"
            >
              {Object.entries(LOCATION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--fg-muted)" }}>Notat (valgfritt)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="F.eks. møte, hjemmekontor..."
            className="input w-full"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Avbryt
          </button>
          <button
            type="submit"
            disabled={duration <= 0 || createEntry.isPending}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {createEntry.isPending ? "Lagrer..." : "Lagre"}
          </button>
        </div>
      </form>
    </div>
  );
}
