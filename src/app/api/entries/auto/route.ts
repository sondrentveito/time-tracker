import { NextRequest, NextResponse } from "next/server";
import { appendSheetRow } from "@/lib/googleSheets";
import { calculateDuration, formatDate } from "@/lib/utils";

/** Auto-log endpoint for iOS Shortcuts / external triggers.
 *  Authenticated via API key (x-api-key header).
 *
 *  Accepts:
 *  - { action: "arrive", location: "office", time?: "HH:mm" }
 *  - { action: "depart", location: "office", time?: "HH:mm" }
 *  - { action: "log", start: "HH:mm", end: "HH:mm", type?: string, location?: string, note?: string }
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

    if (action === "log") {
      const { start, end, type = "work", location = "office", note = "" } = body;
      if (!start || !end) {
        return NextResponse.json({ error: "Missing start/end" }, { status: 400 });
      }

      const duration = calculateDuration(start, end);
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

    // TODO: Implement "arrive"/"depart" actions with state tracking
    // TODO: Implement "parse" action with AI text parsing

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("Auto-log error:", error);
    return NextResponse.json({ error: "Failed to auto-log" }, { status: 500 });
  }
}
