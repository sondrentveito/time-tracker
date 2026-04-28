import { appendSheetRow, fetchSheetRows, readConfigKey } from "@/lib/googleSheets";
import { parseSheetRow } from "@/lib/api";
import {
  addMinutesToTime,
  calculateEntryDuration,
  formatDate,
  getExpectedHours,
  getLunchMinutes,
  normalizeWorkRules,
} from "@/lib/utils";
import type { LocationType, TimeEntry, WorkRulesConfig } from "@/lib/types";
import { isValidLocation, isValidTime, sanitizeNote } from "@/lib/security";

interface WorkdayOptions {
  start?: string;
  end?: string;
  location?: LocationType;
  note?: string;
  auto?: boolean;
}

export async function getWorkRulesFromConfig(): Promise<WorkRulesConfig> {
  const raw = await readConfigKey("work-rules");
  if (!raw) return normalizeWorkRules(null);

  try {
    return normalizeWorkRules(JSON.parse(raw));
  } catch {
    return normalizeWorkRules(null);
  }
}

export async function fetchEntriesWithComputedDuration(
  rules?: WorkRulesConfig,
): Promise<TimeEntry[]> {
  const activeRules = rules ?? await getWorkRulesFromConfig();
  const rows = await fetchSheetRows();
  return rows.map((row) => parseSheetRow(row, activeRules));
}

export async function hasEntryForDate(date: string, rules?: WorkRulesConfig): Promise<boolean> {
  const entries = await fetchEntriesWithComputedDuration(rules);
  return entries.some((entry) => entry.date === date);
}

export async function createWorkdayIfMissing(options: WorkdayOptions = {}) {
  const rules = await getWorkRulesFromConfig();
  const date = formatDate(new Date());

  if (await hasEntryForDate(date, rules)) {
    return { ok: true, skipped: true, reason: "Entry already exists for today" };
  }

  const start = options.start ?? "08:00";
  if (!isValidTime(start)) throw new Error("Invalid start time");

  const expected = getExpectedHours(new Date(), rules);
  const end = options.end ?? addMinutesToTime(start, Math.round(expected * 60 + getLunchMinutes(rules)));
  if (!isValidTime(end)) throw new Error("Invalid end time");

  const location = options.location ?? "home";
  if (!isValidLocation(location)) throw new Error("Invalid location");

  const duration = calculateEntryDuration(start, end, "work", rules);

  const timestamp = await appendSheetRow({
    date,
    start,
    end,
    duration,
    type: "work",
    location,
    note: options.note ? sanitizeNote(options.note) : "Automatisk arbeidsdag",
    auto: options.auto ?? true,
  });

  return { ok: true, skipped: false, timestamp, date, start, end, duration };
}
