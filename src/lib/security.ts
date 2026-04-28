import type { EntryType, LocationType } from "@/lib/types";

const VALID_TYPES: EntryType[] = ["work", "time-off", "vacation", "sick", "leave"];
const VALID_LOCATIONS: LocationType[] = ["office", "home", "other"];
const TIME_REGEX = /^\d{2}:\d{2}$/;

export function safeCompare(a: string, b: string): boolean {
  let mismatch = a.length ^ b.length;
  const maxLength = Math.max(a.length, b.length);

  for (let i = 0; i < maxLength; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return mismatch === 0;
}

export function verifyApiKey(headers: Headers): boolean {
  const expected = process.env.API_KEY;
  const provided = headers.get("x-api-key") || headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expected || !provided) return false;
  return safeCompare(provided, expected);
}

export function isValidTime(value: unknown): value is string {
  if (typeof value !== "string" || !TIME_REGEX.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function isValidEntryType(value: unknown): value is EntryType {
  return typeof value === "string" && VALID_TYPES.includes(value as EntryType);
}

export function isValidLocation(value: unknown): value is LocationType {
  return typeof value === "string" && VALID_LOCATIONS.includes(value as LocationType);
}

export function sanitizeNote(value: unknown, maxLength = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}
