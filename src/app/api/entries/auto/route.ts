import { NextRequest, NextResponse } from "next/server";
import { appendSheetRow, readConfigKey, writeConfigKey } from "@/lib/googleSheets";
import { calculateEntryDuration, formatDate, formatTime, nowOslo } from "@/lib/utils";
import { createWorkdayIfMissing, getWorkRulesFromConfig } from "@/lib/workday";
import { isValidEntryType, isValidLocation, isValidTime, sanitizeNote, verifyApiKey } from "@/lib/security";
import { resolveLocation } from "@/lib/geo";
import {
  getCachedIdempotentResult,
  normalizeIdempotencyKey,
  storeIdempotentResult,
} from "@/lib/idempotency";

function normalizeTime(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\./g, ":").trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  return match[1].padStart(2, "0") + ":" + match[2];
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\/\-]/g, ".").trim();
  const match = normalized.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return undefined;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_\-]{1,32}$/;

function normalizeDeviceId(value: unknown): string {
  if (typeof value !== "string") return "default";
  const trimmed = value.trim();
  if (!trimmed || !DEVICE_ID_PATTERN.test(trimmed)) return "default";
  return trimmed;
}

function arriveStateKey(deviceId: string): `arrive-state:${string}` {
  return `arrive-state:${deviceId}`;
}

async function readArriveState(
  deviceId: string,
): Promise<string | null> {
  const scoped = await readConfigKey(arriveStateKey(deviceId));
  if (scoped) return scoped;
  // Backwards compatibility: fall back to the legacy global slot when the device key is empty.
  if (deviceId === "default") {
    return readConfigKey("arrive-state");
  }
  return null;
}

async function clearArriveState(deviceId: string): Promise<void> {
  await writeConfigKey(arriveStateKey(deviceId), "");
  if (deviceId === "default") {
    await writeConfigKey("arrive-state", "");
  }
}

/** Auto-log endpoint for iOS Shortcuts / external triggers.
 *  Authenticated via API key (x-api-key header).
 *
 *  Common headers:
 *  - x-api-key: required
 *  - Idempotency-Key: optional, dedupes identical requests for 5 minutes
 *
 *  Common body fields:
 *  - deviceId?: string — namespaces arrive/depart state per device (default: "default")
 *  - lat, lon?: number — when present, server resolves location from configured geofences
 *
 *  Accepts:
 *  - { action: "arrive", location?: "office", time?: "HH:mm", lat?, lon? }
 *  - { action: "depart", location?: "office", time?: "HH:mm", lat?, lon? }
 *  - { action: "log", start: "HH:mm", end: "HH:mm", type?, location?, note?, lat?, lon? }
 *  - { action: "workday", start?, end?, location?, note? }
 *  - { action: "parse", text } (TODO)
 */
export async function POST(req: NextRequest) {
  if (!verifyApiKey(req.headers)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const idempotencyKey = normalizeIdempotencyKey(
    req.headers.get("idempotency-key") ?? body.idempotencyKey,
  );
  if (idempotencyKey) {
    const cached = await getCachedIdempotentResult<unknown>(idempotencyKey);
    if (cached) {
      return NextResponse.json({ ...cached as object, idempotent: true });
    }
  }

  try {
    const { action } = body;
    const rules = await getWorkRulesFromConfig();
    const deviceId = normalizeDeviceId(body.deviceId);

    if (action === "log") {
      const start = body.start as unknown;
      const end = body.end as unknown;
      const type = (body.type as string) ?? "work";
      const explicitLocation = body.location as unknown;
      const note = (body.note as string) ?? "";

      if (!isValidTime(start) || !isValidTime(end)) {
        return NextResponse.json({ error: "Invalid start/end" }, { status: 400 });
      }
      if (!isValidEntryType(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }

      const resolved = await resolveLocation({
        lat: body.lat,
        lon: body.lon,
        fallback: isValidLocation(explicitLocation) ? explicitLocation : undefined,
      });
      if (!isValidLocation(resolved.location)) {
        return NextResponse.json({ error: "Invalid location" }, { status: 400 });
      }

      const duration = calculateEntryDuration(start, end, type, rules);
      if (duration <= 0 || duration > 24) {
        return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
      }
      const date = formatDate(nowOslo());

      const timestamp = await appendSheetRow({
        date,
        start,
        end,
        duration,
        type,
        location: resolved.location,
        note: sanitizeNote(note),
        auto: true,
      });

      const result = {
        ok: true,
        timestamp,
        duration,
        location: resolved.location,
        locationSource: resolved.source,
        matchedRule: resolved.matchedRule,
      };
      if (idempotencyKey) await storeIdempotentResult(idempotencyKey, result);
      return NextResponse.json(result);
    }

    if (action === "workday") {
      if (body.start !== undefined && !isValidTime(body.start)) {
        return NextResponse.json({ error: "Invalid start" }, { status: 400 });
      }
      if (body.end !== undefined && !isValidTime(body.end)) {
        return NextResponse.json({ error: "Invalid end" }, { status: 400 });
      }
      if (body.location !== undefined && !isValidLocation(body.location)) {
        return NextResponse.json({ error: "Invalid location" }, { status: 400 });
      }

      const result = await createWorkdayIfMissing({
        start: body.start as string | undefined,
        end: body.end as string | undefined,
        location: body.location as ("office" | "home" | "other") | undefined,
        note: sanitizeNote(body.note),
        auto: true,
      });
      if (idempotencyKey) await storeIdempotentResult(idempotencyKey, result);
      return NextResponse.json(result);
    }

    if (action === "arrive") {
      const explicitLocation = body.location as unknown;
      const resolved = await resolveLocation({
        lat: body.lat,
        lon: body.lon,
        fallback: isValidLocation(explicitLocation) ? explicitLocation : undefined,
      });

      const now = nowOslo();
      const time = normalizeTime(body.time) || formatTime(now);
      if (!isValidTime(time)) {
        return NextResponse.json({ error: "Invalid time" }, { status: 400 });
      }

      const date = normalizeDate(body.date) || formatDate(now);
      const state = { time, location: resolved.location, date };
      await writeConfigKey(arriveStateKey(deviceId), JSON.stringify(state));

      const result = {
        ok: true,
        arrived: time,
        location: resolved.location,
        locationSource: resolved.source,
        matchedRule: resolved.matchedRule,
        deviceId,
      };
      if (idempotencyKey) await storeIdempotentResult(idempotencyKey, result);
      return NextResponse.json(result);
    }

    if (action === "depart") {
      const raw = await readArriveState(deviceId);
      if (!raw) {
        return NextResponse.json(
          { error: "No active arrival found", deviceId },
          { status: 400 },
        );
      }

      let state: { time: string; location: string; date: string };
      try {
        state = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: "Corrupt arrival state" }, { status: 400 });
      }

      const now = nowOslo();
      const departTime = normalizeTime(body.time) || formatTime(now);
      if (!isValidTime(departTime)) {
        return NextResponse.json({ error: "Invalid time" }, { status: 400 });
      }

      const explicitLocation = body.location as unknown;
      const fallback = isValidLocation(explicitLocation)
        ? explicitLocation
        : isValidLocation(state.location)
          ? (state.location as "office" | "home" | "other")
          : undefined;
      const resolved = await resolveLocation({
        lat: body.lat,
        lon: body.lon,
        fallback,
      });
      if (!isValidLocation(resolved.location)) {
        return NextResponse.json({ error: "Invalid location" }, { status: 400 });
      }

      const duration = calculateEntryDuration(state.time, departTime, "work", rules);
      if (duration <= 0 || duration > 24) {
        return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
      }

      const timestamp = await appendSheetRow({
        date: state.date,
        start: state.time,
        end: departTime,
        duration,
        type: "work",
        location: resolved.location,
        note: sanitizeNote(body.note || "Auto: arrive/depart"),
        auto: true,
      });

      await clearArriveState(deviceId);

      const result = {
        ok: true,
        timestamp,
        start: state.time,
        end: departTime,
        duration,
        location: resolved.location,
        locationSource: resolved.source,
        matchedRule: resolved.matchedRule,
        deviceId,
      };
      if (idempotencyKey) await storeIdempotentResult(idempotencyKey, result);
      return NextResponse.json(result);
    }

    // TODO: Implement "parse" action with AI text parsing

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("Auto-log error:", error);
    return NextResponse.json({ error: "Failed to auto-log" }, { status: 500 });
  }
}
