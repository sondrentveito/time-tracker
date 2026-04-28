import type { TimeEntry, WorkRulesConfig } from "@/lib/types";
import type { SheetRecord } from "@/lib/googleSheets";
import { calculateEntryDuration } from "@/lib/utils";

const API_BASE = "/api";

/** Fetch all time entries */
export async function fetchEntries(): Promise<TimeEntry[]> {
  const res = await fetch(`${API_BASE}/entries`);
  if (!res.ok) throw new Error("Failed to fetch entries");
  const data = await res.json();
  return data.entries;
}

/** Create a new time entry */
export async function createEntry(entry: Omit<TimeEntry, "timestamp">): Promise<{ timestamp: string }> {
  const res = await fetch(`${API_BASE}/entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error("Failed to create entry");
  return res.json();
}

/** Update a time entry by timestamp */
export async function updateEntry(
  timestamp: string,
  updates: Partial<Omit<TimeEntry, "timestamp">>
): Promise<void> {
  const res = await fetch(`${API_BASE}/entries`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timestamp, ...updates }),
  });
  if (!res.ok) throw new Error("Failed to update entry");
}

/** Delete a time entry by timestamp */
export async function deleteEntry(timestamp: string): Promise<void> {
  const res = await fetch(`${API_BASE}/entries`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timestamp }),
  });
  if (!res.ok) throw new Error("Failed to delete entry");
}

/** Parse a SheetRecord row into a TimeEntry */
export function parseSheetRow(row: SheetRecord, rules?: WorkRulesConfig): TimeEntry {
  const type = normalizeEntryType(row.type);
  const duration = rules && row.start && row.end
    ? calculateEntryDuration(row.start, row.end, type, rules)
    : parseFloat(row.duration) || 0;

  return {
    timestamp: row.timestamp || "",
    date: normalizeDate(row.date || ""),
    start: row.start || "",
    end: row.end || "",
    duration,
    type,
    location: normalizeLocation(row.location),
    note: row.note || "",
    auto: row.auto === "true",
  };
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!isoDate) return trimmed;
  const [, year, month, day] = isoDate;
  return `${day}.${month}.${year}`;
}

function normalizeEntryType(value?: string): TimeEntry["type"] {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (["work", "time-off", "vacation", "sick", "leave"].includes(normalized)) {
    return normalized as TimeEntry["type"];
  }
  const labels: Record<string, TimeEntry["type"]> = {
    arbeid: "work",
    avspasering: "time-off",
    ferie: "vacation",
    syk: "sick",
    permisjon: "leave",
  };
  return labels[normalized] ?? "work";
}

function normalizeLocation(value?: string): TimeEntry["location"] {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (["office", "home", "other"].includes(normalized)) {
    return normalized as TimeEntry["location"];
  }
  const labels: Record<string, TimeEntry["location"]> = {
    kontor: "office",
    hjemmekontor: "home",
    hjemme: "home",
    annet: "other",
  };
  return labels[normalized] ?? "office";
}
