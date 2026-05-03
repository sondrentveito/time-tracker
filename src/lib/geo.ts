import type { LocationRule, LocationType, LocationsConfig } from "@/lib/types";
import { readConfigKey } from "@/lib/googleSheets";

const EARTH_RADIUS_METERS = 6_371_008;

/** Haversine distance in meters between two lat/lon coordinates. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/** Validate that a value looks like a finite latitude/longitude pair. */
export function isValidCoord(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

/** Read configured location rules from the Config tab. */
export async function getLocationRules(): Promise<LocationRule[]> {
  const raw = await readConfigKey("locations");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LocationsConfig | LocationRule[];
    if (Array.isArray(parsed)) return parsed;
    return parsed.rules ?? [];
  } catch {
    return [];
  }
}export interface GeoMatch {
  rule: LocationRule;
  distanceMeters: number;
}

/** Find the closest configured rule whose radius contains the given point. */
export function matchLocation(
  rules: LocationRule[],
  lat: number,
  lon: number,
): GeoMatch | null {
  let best: GeoMatch | null = null;
  for (const rule of rules) {
    const d = distanceMeters(lat, lon, rule.latitude, rule.longitude);
    if (d <= rule.radiusMeters && (!best || d < best.distanceMeters)) {
      best = { rule, distanceMeters: d };
    }
  }
  return best;
}

/** Resolve a LocationType from optional GPS coordinates and an optional explicit fallback.
 *  Returns the matched location plus diagnostic info for the response. */
export async function resolveLocation(input: {
  lat?: unknown;
  lon?: unknown;
  fallback?: LocationType;
}): Promise<{
  location: LocationType;
  matchedRule?: { id: string; name: string; distanceMeters: number };
  source: "geo" | "fallback" | "default";
}> {
  if (isValidCoord(input.lat, input.lon)) {
    const lat = input.lat as number;
    const lon = input.lon as number;
    const rules = await getLocationRules();
    const match = matchLocation(rules, lat, lon);
    if (match) {
      return {
        location: match.rule.locationType,
        matchedRule: {
          id: match.rule.id,
          name: match.rule.name,
          distanceMeters: Math.round(match.distanceMeters),
        },
        source: "geo",
      };
    }
    return { location: input.fallback ?? "other", source: "fallback" };
  }
  return { location: input.fallback ?? "office", source: "default" };
}
