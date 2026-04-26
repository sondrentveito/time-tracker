import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { fetchSheetRows, appendSheetRow, updateSheetRow, deleteSheetRow } from "@/lib/googleSheets";
import { parseSheetRow } from "@/lib/api";

export const GET = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await fetchSheetRows();
    const entries = rows.map(parseSheetRow);
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
    const { date, start, end, duration, type, location, note, auto } = body;

    if (!date || !start || !end || duration === undefined || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
