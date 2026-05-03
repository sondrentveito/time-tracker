import { readConfigKey, writeConfigKey } from "@/lib/googleSheets";

/** Window during which a repeated request with the same key returns the cached result.
 *  5 minutes covers double-fires from iOS Shortcuts geofence triggers and quick retries. */
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

const MAX_KEY_LEN = 64;

export function normalizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_KEY_LEN) return null;
  // Restrict to URL/header-safe characters since we use the key inside a Config row identifier
  if (!/^[A-Za-z0-9_\-:.]+$/.test(trimmed)) return null;
  return trimmed;
}

interface StoredEntry<T> {
  result: T;
  expiresAt: number;
}

export async function getCachedIdempotentResult<T>(
  key: string,
): Promise<T | null> {
  const raw = await readConfigKey(`idem:${key}`);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as StoredEntry<T>;
    if (typeof entry.expiresAt !== "number" || Date.now() > entry.expiresAt) {
      return null;
    }
    return entry.result;
  } catch {
    return null;
  }
}

/** Store a result under the given idempotency key.
 *  Failures are swallowed because storing the cache must never break a successful request. */
export async function storeIdempotentResult<T>(
  key: string,
  result: T,
): Promise<void> {
  const entry: StoredEntry<T> = {
    result,
    expiresAt: Date.now() + IDEMPOTENCY_WINDOW_MS,
  };
  try {
    await writeConfigKey(`idem:${key}`, JSON.stringify(entry));
  } catch (error) {
    console.error("[idempotency] Failed to store result:", error);
  }
}
