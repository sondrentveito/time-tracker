import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/security";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "0",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
  "Cross-Origin-Opener-Policy": "same-origin",
  ...(process.env.NODE_ENV === "production"
    ? {
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        "Content-Security-Policy": [
          "default-src 'self'",
          "base-uri 'self'",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "form-action 'self'",
          "manifest-src 'self'",
          "worker-src 'self'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "style-src 'self' 'unsafe-inline'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "connect-src 'self' https://accounts.google.com https://sheets.googleapis.com",
          "frame-src https://accounts.google.com",
        ].join("; "),
      }
    : {}),
};

// Simple in-memory rate limiter for API routes
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW = 60_000;
const RATE_MAP_MAX_SIZE = 10_000;

function cleanupRateMap() {
  if (rateMap.size <= RATE_MAP_MAX_SIZE) return;
  const now = Date.now();
  for (const [key, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(key);
  }
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  cleanupRateMap();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Rate limit API routes
  if (pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
  }

  // Public paths
  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico";

  // Widget, auto-log and scheduled nudge APIs use API key auth
  const isApiKeyRoute = pathname === "/api/widget" || pathname === "/api/entries/auto" || pathname === "/api/push/nudge";

  if (isApiKeyRoute) {
    if (!verifyApiKey(req.headers)) {
      const res = new NextResponse(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
      for (const [key, value] of Object.entries(securityHeaders)) {
        res.headers.set(key, value);
      }
      return res;
    }
    const res = NextResponse.next();
    for (const [key, value] of Object.entries(securityHeaders)) {
      res.headers.set(key, value);
    }
    return res;
  }

  const response = isPublic ? NextResponse.next() : undefined;

  // If not public and not authenticated -> redirect to login
  if (!response && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const [key, value] of Object.entries(securityHeaders)) {
      redirectResponse.headers.set(key, value);
    }
    return redirectResponse;
  }

  const finalResponse = response ?? NextResponse.next();
  for (const [key, value] of Object.entries(securityHeaders)) {
    finalResponse.headers.set(key, value);
  }
  return finalResponse;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/).*)",
  ],
};
