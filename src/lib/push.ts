import webPush, { type PushSubscription } from "web-push";
import { readConfigKey, writeConfigKey } from "@/lib/googleSheets";

const PUSH_SUBSCRIPTIONS_KEY = "push-subscriptions";

export interface StoredPushSubscription extends PushSubscription {
  createdAt: string;
  updatedAt: string;
  userAgent?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  actions?: Array<{ action: string; title: string }>;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function getVapidPrivateKey(): string | null {
  return process.env.VAPID_PRIVATE_KEY || null;
}

export function isPushConfigured(): boolean {
  return !!getVapidPublicKey() && !!getVapidPrivateKey();
}

function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys");
  }

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:notifications@horavo.local",
    publicKey,
    privateKey,
  );
}

export async function readPushSubscriptions(): Promise<StoredPushSubscription[]> {
  const raw = await readConfigKey(PUSH_SUBSCRIPTIONS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredSubscription);
  } catch {
    return [];
  }
}

export async function savePushSubscription(input: unknown, userAgent?: string): Promise<StoredPushSubscription> {
  const subscription = parsePushSubscription(input);
  if (!subscription) throw new Error("Invalid push subscription");

  const now = new Date().toISOString();
  const subscriptions = await readPushSubscriptions();
  const existing = subscriptions.find((sub) => sub.endpoint === subscription.endpoint);
  const stored: StoredPushSubscription = {
    ...subscription,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    userAgent,
  };

  const next = [
    ...subscriptions.filter((sub) => sub.endpoint !== subscription.endpoint),
    stored,
  ];

  await writeConfigKey(PUSH_SUBSCRIPTIONS_KEY, JSON.stringify(next));
  return stored;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const subscriptions = await readPushSubscriptions();
  const next = subscriptions.filter((sub) => sub.endpoint !== endpoint);
  await writeConfigKey(PUSH_SUBSCRIPTIONS_KEY, JSON.stringify(next));
}

export async function sendPushNotification(subscription: PushSubscription, payload: PushPayload) {
  configureWebPush();
  return webPush.sendNotification(subscription, JSON.stringify(payload));
}

function parsePushSubscription(input: unknown): PushSubscription | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Partial<PushSubscription>;

  if (
    typeof value.endpoint !== "string" ||
    !value.keys ||
    typeof value.keys.p256dh !== "string" ||
    typeof value.keys.auth !== "string"
  ) {
    return null;
  }

  return {
    endpoint: value.endpoint,
    keys: {
      p256dh: value.keys.p256dh,
      auth: value.keys.auth,
    },
  };
}

function isStoredSubscription(input: unknown): input is StoredPushSubscription {
  if (!input || typeof input !== "object") return false;
  const value = input as Partial<StoredPushSubscription>;
  return !!parsePushSubscription(value) && typeof value.createdAt === "string" && typeof value.updatedAt === "string";
}
