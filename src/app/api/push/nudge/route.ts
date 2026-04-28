import { NextRequest, NextResponse } from "next/server";
import { formatDate } from "@/lib/utils";
import { hasEntryForDate } from "@/lib/workday";
import { readConfigKey, writeConfigKey } from "@/lib/googleSheets";
import {
  isPushConfigured,
  readPushSubscriptions,
  removePushSubscription,
  sendPushNotification,
  type PushPayload,
} from "@/lib/push";

const NUDGE_STATE_KEY = "push-nudge-state";

function verifyApiKey(req: NextRequest): boolean {
  const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
  return !!process.env.API_KEY && apiKey === process.env.API_KEY;
}

export async function POST(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push is not configured" }, { status: 400 });
  }

  const today = new Date();
  if (today.getDay() === 0 || today.getDay() === 6) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Weekend" });
  }

  const date = formatDate(today);
  const state = await readNudgeState();

  if (state[date]) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Nudge already sent today" });
  }

  if (await hasEntryForDate(date)) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Entry already exists for today" });
  }

  const subscriptions = await readPushSubscriptions();
  const payload: PushPayload = {
    title: "Skal tempo logge dagen?",
    body: "Ingen arbeidsdag er logget ennå. Trykk for å velge starttid.",
    tag: `workday-nudge-${date}`,
    url: "/?nudge=workday",
    actions: [
      { action: "open", title: "Åpne tempo" },
    ],
  };

  let sent = 0;
  let removed = 0;

  for (const subscription of subscriptions) {
    try {
      await sendPushNotification(subscription, payload);
      sent++;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 0;
      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(subscription.endpoint);
        removed++;
      } else {
        console.error("Failed to send push notification:", error);
      }
    }
  }

  if (sent > 0) {
    state[date] = new Date().toISOString();
    await writeConfigKey(NUDGE_STATE_KEY, JSON.stringify(state));
  }

  return NextResponse.json({ ok: true, sent, removed });
}

async function readNudgeState(): Promise<Record<string, string>> {
  const raw = await readConfigKey(NUDGE_STATE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
