import type { EntryType, TimeEntry, WorkRulesConfig } from "./types";

// ─── Date Parsing ───

/** Parse "dd.mm.yyyy" to Date object. Returns null for invalid input. */
export function parseDate(dateStr: string): Date {
  if (!dateStr || !/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    return new Date(NaN);
  }
  const [day, month, year] = dateStr.split(".").map(Number);
  return new Date(year, month - 1, day);
}

/** Format Date to "dd.mm.yyyy" */
export function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/** Format Date to "HH:mm" */
export function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Format decimal hours to "Xt Ym" (e.g. 7.5 -> "7t 30m") */
export function formatDuration(hours: number): string {
  const h = Math.floor(Math.abs(hours));
  const m = Math.round((Math.abs(hours) - h) * 60);
  const sign = hours < 0 ? "-" : "";
  if (m === 0) return `${sign}${h}t`;
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}t ${m}m`;
}

/** Calculate duration between two time strings "HH:mm" in decimal hours.
 *  Handles cross-midnight shifts (e.g. 22:00 -> 06:00 = 8 hours). */
export function calculateDuration(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // cross-midnight
  }
  return (endMinutes - startMinutes) / 60;
}

const LUNCH_DEDUCTION_THRESHOLD_HOURS = 5;

export function getLunchMinutes(rules: WorkRulesConfig): number {
  return Math.max(0, rules.lunchMinutes ?? getDefaultWorkRules().lunchMinutes);
}

export function calculateEntryDuration(
  start: string,
  end: string,
  type: EntryType,
  rules: WorkRulesConfig,
): number {
  const gross = calculateDuration(start, end);
  const lunchHours = getLunchMinutes(rules) / 60;

  if (type !== "work" || gross <= LUNCH_DEDUCTION_THRESHOLD_HOURS || lunchHours <= 0) {
    return gross;
  }

  return Math.max(0, gross - lunchHours);
}

export function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const total = (hours * 60 + minutes + minutesToAdd) % (24 * 60);
  const normalized = total < 0 ? total + 24 * 60 : total;
  const h = Math.floor(normalized / 60).toString().padStart(2, "0");
  const m = (normalized % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ─── Week Helpers ───

/** Get ISO week number */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** Get Monday of the week for a given date */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get array of 5 weekdays (Mon-Fri) starting from the Monday of the given date */
export function getWeekdays(date: Date): Date[] {
  const monday = getMonday(date);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Get day name in Norwegian (short) */
export function getDayName(date: Date): string {
  return date.toLocaleDateString("nb-NO", { weekday: "short" });
}

/** Get month name in Norwegian */
export function getMonthName(date: Date): string {
  return date.toLocaleDateString("nb-NO", { month: "long" });
}

// ─── Work Rules Helpers ───

/** Get the expected hours for a specific date based on work rules */
export function getExpectedHours(date: Date, rules: WorkRulesConfig): number {
  // Skip weekends
  const day = date.getDay();
  if (day === 0 || day === 6) return 0;

  const mmdd = `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

  for (const period of rules.periods) {
    if (isDateInPeriod(mmdd, period.from, period.to)) {
      return period.hoursPerDay;
    }
  }

  return rules.defaultHoursPerDay;
}

/** Check if an MM-DD string falls within a period range */
function isDateInPeriod(mmdd: string, from: string, to: string): boolean {
  // Handle wrap-around (e.g. from "09-01" to "05-14" crosses year boundary)
  if (from <= to) {
    return mmdd >= from && mmdd <= to;
  }
  return mmdd >= from || mmdd <= to;
}

/** Get default work rules */
export function getDefaultWorkRules(): WorkRulesConfig {
  return {
    defaultHoursPerDay: 7.5,
    lunchMinutes: 30,
    periods: [
      {
        id: "summer",
        from: "05-15",
        to: "08-31",
        hoursPerDay: 7,
        label: "Sommertid",
      },
    ],
  };
}

export function normalizeWorkRules(rules: Partial<WorkRulesConfig> | null | undefined): WorkRulesConfig {
  const defaults = getDefaultWorkRules();
  return {
    defaultHoursPerDay: Number.isFinite(rules?.defaultHoursPerDay)
      ? rules!.defaultHoursPerDay!
      : defaults.defaultHoursPerDay,
    lunchMinutes: Number.isFinite(rules?.lunchMinutes)
      ? rules!.lunchMinutes!
      : defaults.lunchMinutes,
    periods: Array.isArray(rules?.periods) ? rules!.periods! : defaults.periods,
  };
}

// ─── Flex Balance Calculation ───

/** Calculate flex balance from entries and work rules */
export function calculateFlexBalance(
  entries: TimeEntry[],
  rules: WorkRulesConfig,
  startBalance: number = 0,
  startDate?: string,
): number {
  let balance = startBalance;

  const filteredEntries = startDate
    ? entries.filter((e) => parseDate(e.date) >= parseDate(startDate))
    : entries;

  // Group entries by date
  const byDate = new Map<string, TimeEntry[]>();
  for (const entry of filteredEntries) {
    const existing = byDate.get(entry.date) || [];
    existing.push(entry);
    byDate.set(entry.date, existing);
  }

  for (const [dateStr, dayEntries] of byDate) {
    const date = parseDate(dateStr);
    const expected = getExpectedHours(date, rules);

    // Sum actual work hours for this day
    const workHours = dayEntries
      .filter((e) => e.type === "work")
      .reduce((sum, e) => sum + e.duration, 0);

    // Time-off entries reduce balance
    const timeOffHours = dayEntries
      .filter((e) => e.type === "time-off")
      .reduce((sum, e) => sum + e.duration, 0);

    // Sick / vacation / leave count as expected hours (no flex impact)
    const absenceHours = dayEntries
      .filter((e) => e.type === "sick" || e.type === "vacation" || e.type === "leave")
      .reduce((sum, e) => sum + e.duration, 0);

    // If a day has absence entries covering the full day, no flex impact
    if (absenceHours >= expected) {
      // Full day absence, no flex change
      balance -= timeOffHours;
      continue;
    }

    // Flex = actual work - (expected - absence hours already covered)
    const remainingExpected = expected - absenceHours;
    balance += workHours - remainingExpected;
    balance -= timeOffHours;
  }

  return balance;
}

// ─── Period Filtering ───

export type PeriodType = "week" | "month" | "year";

export function filterEntriesByPeriod(
  entries: TimeEntry[],
  period: PeriodType,
  referenceDate: Date = new Date(),
): TimeEntry[] {
  switch (period) {
    case "week": {
      const monday = getMonday(referenceDate);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      return entries.filter((e) => {
        const d = parseDate(e.date);
        return d >= monday && d <= sunday;
      });
    }
    case "month": {
      const year = referenceDate.getFullYear();
      const month = referenceDate.getMonth();
      return entries.filter((e) => {
        const d = parseDate(e.date);
        return d.getFullYear() === year && d.getMonth() === month;
      });
    }
    case "year": {
      const year = referenceDate.getFullYear();
      return entries.filter((e) => {
        const d = parseDate(e.date);
        return d.getFullYear() === year;
      });
    }
  }
}

// ─── Norwegian date formatting ───

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

/** Check if a date string (dd.mm.yyyy) is today */
export function isToday(dateStr: string): boolean {
  const d = parseDate(dateStr);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}
