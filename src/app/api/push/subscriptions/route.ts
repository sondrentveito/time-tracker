import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { readPushSubscriptions, removePushSubscription, savePushSubscription } from "@/lib/push";

export const GET = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await readPushSubscriptions();
  return NextResponse.json({ count: subscriptions.length });
});

export const POST = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    await savePushSubscription(body.subscription, req.headers.get("user-agent") ?? undefined);
    const subscriptions = await readPushSubscriptions();
    return NextResponse.json({ ok: true, count: subscriptions.length });
  } catch (error) {
    console.error("Failed to save push subscription:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 400 });
  }
});

export const DELETE = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.endpoint || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await removePushSubscription(body.endpoint);
  const subscriptions = await readPushSubscriptions();
  return NextResponse.json({ ok: true, count: subscriptions.length });
});
