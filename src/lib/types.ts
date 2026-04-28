// ─── Time Entry ───

export type EntryType = "work" | "time-off" | "vacation" | "sick" | "leave";
export type LocationType = "office" | "home" | "other";

export interface TimeEntry {
  timestamp: string;      // ISO string (created at)
  date: string;           // dd.mm.yyyy
  start: string;          // HH:mm
  end: string;            // HH:mm
  duration: number;       // decimal hours (e.g. 7.5)
  type: EntryType;        // work, time-off, vacation, sick, leave
  location: LocationType; // office, home, other
  note: string;           // free text
  auto: boolean;          // was this auto-logged?
}

// ─── Work Rules (configurable normal hours per period) ───

export interface WorkPeriod {
  id: string;
  from: string;           // MM-DD (e.g. "01-01")
  to: string;             // MM-DD (e.g. "05-14")
  hoursPerDay: number;    // e.g. 7.5
  label: string;          // e.g. "Normal" or "Sommertid"
}

export interface WorkRulesConfig {
  periods: WorkPeriod[];
  defaultHoursPerDay: number;
  lunchMinutes: number;     // fixed lunch deduction for long work entries
}

// ─── Location Rules (for auto-logging) ───

export interface LocationRule {
  id: string;
  name: string;           // e.g. "Kontoret"
  latitude: number;
  longitude: number;
  radiusMeters: number;   // geofence radius
  locationType: LocationType;
}

export interface LocationsConfig {
  rules: LocationRule[];
}

// ─── Flex Balance ───

export interface FlexBalanceConfig {
  startBalance: number;   // hours (can be negative)
  startDate: string;      // dd.mm.yyyy — from when to start calculating
}

// ─── Config keys stored in Google Sheets ───

export type ConfigKey =
  | "work-rules"
  | "locations"
  | "flex-balance"
  | "seen-locations"
  | "push-subscriptions"
  | "push-nudge-state";

// ─── Entry type display helpers ───

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  work: "Arbeid",
  "time-off": "Avspasering",
  vacation: "Ferie",
  sick: "Syk",
  leave: "Permisjon",
};

export const ENTRY_TYPE_COLORS: Record<EntryType, string> = {
  work: "var(--accent)",
  "time-off": "var(--ok)",
  vacation: "var(--warn)",
  sick: "var(--danger)",
  leave: "var(--fg-muted)",
};

export const LOCATION_LABELS: Record<LocationType, string> = {
  office: "Kontor",
  home: "Hjemmekontor",
  other: "Annet",
};
