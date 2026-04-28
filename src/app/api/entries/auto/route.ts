import { NextRequest, NextResponse } from "next/server";
import { appendSheetRow } from "@/lib/googleSheets";
import { calculateEntryDuration, formatDate } from "@/lib/utils";
import { createWorkdayIfMissing, getWorkRulesFromConfig } from "@/lib/workday";

/** Auto-log endpoint for iOS Shortcuts / external triggers.
 *  Authenticated via API key (x-api-key header).
 *
 *  Accepts:
 *  - { action: "arrive", location: "office", time?: "HH:mm" }
 *  - { action: "depart", location: "office", time?: "HH:mm" }
 *  - { action: "log", start: "HH:mm", end: "HH:mm", type?: string, location?: string, note?: string }
 *  - { action: "workday", start?: "HH:mm", end?: "HH:mm", location?: string, note?: string }
 *  - { action: "parse", text: "Jobbet 8-16 hjemmefra" } (AI-powered)
 */
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const rules = await getWorkRulesFromConfig();

    if (action === "log") {
      const { start, end, type = "work", location = "office", note = "" } = body;
      if (!start || !end) {
        return NextResponse.json({ error: "Missing start/end" }, { status: 400 });
      }

      const duration = calculateEntryDuration(start, end, type, rules);
      const date = formatDate(new Date());

      const timestamp = await appendSheetRow({
        date,
        start,
        end,
        duration,
        type,
        location,
        note,
        auto: true,
      });

      return NextResponse.json({ ok: true, timestamp, duration });
    }

    if (action === "workday") {
      const result = await createWorkdayIfMissing({
        start: body.start,
        end: body.end,
        location: body.location,
        note: body.note,
        auto: true,
      });
      return NextResponse.json(result);
    }

    // TODO: Implement "arrive"/"depart" actions with state tracking
    // TODO: Implement "parse" action with AI text parsing

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("Auto-log error:", error);
    return NextResponse.json({ error: "Failed to auto-log" }, { status: 500 });
  }
}
