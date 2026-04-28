import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { readConfig, readConfigKey, writeConfigKey } from "@/lib/googleSheets";
import type { ConfigKey } from "@/lib/types";

const USER_CONFIG_KEYS: ConfigKey[] = [
  "work-rules",
  "locations",
  "flex-balance",
  "seen-locations",
];

export const GET = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (key) {
      if (!USER_CONFIG_KEYS.includes(key as ConfigKey)) {
        return NextResponse.json({ error: `Invalid config key: ${key}` }, { status: 400 });
      }
      const value = await readConfigKey(key);
      return NextResponse.json({ key, value });
    }

    const config = await readConfig();
    const safeConfig = Object.fromEntries(
      Object.entries(config).filter(([key]) => USER_CONFIG_KEYS.includes(key as ConfigKey))
    );
    return NextResponse.json({ config: safeConfig });
  } catch (error) {
    console.error("Failed to read config:", error);
    return NextResponse.json({ error: "Failed to read config" }, { status: 500 });
  }
});

export const PUT = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    if (!USER_CONFIG_KEYS.includes(key as ConfigKey)) {
      return NextResponse.json({ error: `Invalid config key: ${key}` }, { status: 400 });
    }

    await writeConfigKey(key, value);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to write config:", error);
    return NextResponse.json({ error: "Failed to write config" }, { status: 500 });
  }
});
