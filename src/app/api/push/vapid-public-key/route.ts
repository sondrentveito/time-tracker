import { NextResponse } from "next/server";
import { getVapidPublicKey, isPushConfigured } from "@/lib/push";

export async function GET() {
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
    configured: isPushConfigured(),
  });
}
