import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { appendSheetRow, updateSheetRow, deleteSheetRow } from "@/lib/googleSheets";
import { calculateEntryDuration } from "@/lib/utils";
import { fetchEntriesWithComputedDuration, getWorkRulesFromConfig } from "@/lib/workday";
import type { EntryType, LocationType } from "@/lib/types";

const VALID_TYPES: EntryType[] = ["work", "time-off", "vacation", "sick", "leave"];
const VALID_LOCATIONS: LocationType[] = ["office", "home", "other"];
const DATE_REGEX = /^\d{2}\.\d{2}\.\d{4}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

export const GET = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await fetchEntriesWithComputedDuration();
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Failed to fetch entries:", error);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
});

export const POST = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { date, start, end, type, location, note, auto } = body;

    if (!date || !start || !end || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!DATE_REGEX.test(date)) {
      return NextResponse.json({ error: "Invalid date format. Use dd.mm.yyyy" }, { status: 400 });
    }

    if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end)) {
      return NextResponse.json({ error: "Invalid time format. Use HH:mm" }, { status: 400 });
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` }, { status: 400 });
    }

    if (location && !VALID_LOCATIONS.includes(location)) {
      return NextResponse.json({ error: `Invalid location. Must be one of: ${VALID_LOCATIONS.join(", ")}` }, { status: 400 });
    }

    const rules = await getWorkRulesFromConfig();
    const duration = calculateEntryDuration(start, end, type, rules);

    if (duration <= 0 || duration > 24) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    const timestamp = await appendSheetRow({
      date,
      start,
      end,
      duration,
      type,
      location: location || "office",
      note: note || "",
      auto: auto || false,
    });

    return NextResponse.json({ timestamp });
  } catch (error) {
    console.error("Failed to create entry:", error);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
});

export const PUT = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { timestamp, ...updates } = body;

    if (!timestamp) {
      return NextResponse.json({ error: "Missing timestamp" }, { status: 400 });
    }

    // Validate update fields if provided
    if (updates.date && !DATE_REGEX.test(updates.date)) {
      return NextResponse.json({ error: "Invalid date format. Use dd.mm.yyyy" }, { status: 400 });
    }
    if (updates.start && !TIME_REGEX.test(updates.start)) {
      return NextResponse.json({ error: "Invalid start time format. Use HH:mm" }, { status: 400 });
    }
    if (updates.end && !TIME_REGEX.test(updates.end)) {
      return NextResponse.json({ error: "Invalid end time format. Use HH:mm" }, { status: 400 });
    }
    if (updates.type && !VALID_TYPES.includes(updates.type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (updates.location && !VALID_LOCATIONS.includes(updates.location)) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
    const rules = await getWorkRulesFromConfig();
    const existingEntries = await fetchEntriesWithComputedDuration(rules);
    const existing = existingEntries.find((entry) => entry.timestamp === timestamp);

    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const nextStart = updates.start ?? existing.start;
    const nextEnd = updates.end ?? existing.end;
    const nextType = updates.type ?? existing.type;

    if (!TIME_REGEX.test(nextStart) || !TIME_REGEX.test(nextEnd)) {
      return NextResponse.json({ error: "Invalid existing time format" }, { status: 400 });
    }

    updates.duration = calculateEntryDuration(nextStart, nextEnd, nextType, rules);

    if (updates.duration <= 0 || updates.duration > 24) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    const success = await updateSheetRow(timestamp, updates);
    if (!success) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update entry:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
});

export const DELETE = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { timestamp } = body;

    if (!timestamp) {
      return NextResponse.json({ error: "Missing timestamp" }, { status: 400 });
    }

    const success = await deleteSheetRow(timestamp);
    if (!success) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
});
