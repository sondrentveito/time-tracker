import type { TimeEntry } from "@/lib/types";
import type { SheetRecord } from "@/lib/googleSheets";

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
export function parseSheetRow(row: SheetRecord): TimeEntry {
  return {
    timestamp: row.timestamp || "",
    date: row.date || "",
    start: row.start || "",
    end: row.end || "",
    duration: parseFloat(row.duration) || 0,
    type: (row.type as TimeEntry["type"]) || "work",
    location: (row.location as TimeEntry["location"]) || "office",
    note: row.note || "",
    auto: row.auto === "true",
  };
}
