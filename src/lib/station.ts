import { z } from "zod";
import { isRecentReading } from "./stationReading";
import { haversineKm, toGrid } from "./distance";
import { UPSTREAM_CACHE_S, UPSTREAM_TIMEOUT_MS } from "./limits";
import { env } from "./env";
import type { StationReading } from "./types";

/**
 * Optional ground-station readings from WAQI (aqicn.org), enabled by WAQI_TOKEN.
 * Station data beats a ~40 km model grid for "what is the air like right now".
 * WAQI reports pollutant values as US-EPA AQI sub-indices, so we convert them back
 * to µg/m³ and then apply India's CPCB scale ourselves.
 *
 * Conversion accuracy, checked on 11 WAQI/OpenAQ station pairs (Delhi, Mumbai, Kolkata, Chennai,
 * Bengaluru, readings ≤90 min apart): mean absolute error 13.0% with the 2024 EPA table below and
 * 10.9% with the pre-2024 table. That gap is within the noise from WAQI's smoothing, so we keep the
 * current official table. Treat WAQI-derived PM2.5 as accurate to roughly ±15%.
 * OpenAQ (raw µg/m³) is preferred where available; see openaq.ts.
 */

const MAX_KM = 40;
const MAX_AGE_H = 6;

const WaqiSchema = z.object({
  status: z.literal("ok"),
  data: z.object({
    city: z.object({ name: z.string(), geo: z.tuple([z.number(), z.number()]) }),
    iaqi: z.object({
      pm25: z.object({ v: z.number() }).optional(),
      pm10: z.object({ v: z.number() }).optional(),
    }),
    time: z.object({ iso: z.string() }),
  }),
});

/** One band of the EPA table: [indexLow, indexHigh, concentrationLow, concentrationHigh]. */
type Breakpoint = readonly [number, number, number, number];
// US EPA breakpoints (PM2.5 as revised in 2024; PM10 unchanged).
export const US_PM25: readonly Breakpoint[] = [
  [0, 50, 0, 9],
  [51, 100, 9.1, 35.4],
  [101, 150, 35.5, 55.4],
  [151, 200, 55.5, 125.4],
  [201, 300, 125.5, 225.4],
  [301, 500, 225.5, 500],
];
export const US_PM10: readonly Breakpoint[] = [
  [0, 50, 0, 54],
  [51, 100, 55, 154],
  [101, 150, 155, 254],
  [151, 200, 255, 354],
  [201, 300, 355, 424],
  [301, 500, 425, 604],
];

/** Inverse of the EPA AQI formula: sub-index back to µg/m³. */
export function usIndexToUg(index: number, table: readonly Breakpoint[]): number {
  const clamped = Math.max(0, Math.min(500, index));
  const band = table.find(([, indexHigh]) => clamped <= indexHigh) ?? table[table.length - 1];
  const [indexLow, indexHigh, concLow, concHigh] = band;
  return concLow + ((clamped - indexLow) / (indexHigh - indexLow)) * (concHigh - concLow);
}

/** Pure parser, exported for tests. Returns null if the station is too far, too old or has no PM2.5. */
export function parseWaqi(raw: unknown, lat: number, lon: number, now = new Date()): StationReading | null {
  const parsed = WaqiSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { city, iaqi, time } = parsed.data.data;
  if (!iaqi.pm25) return null;
  const km = haversineKm(lat, lon, city.geo[0], city.geo[1]);
  if (km > MAX_KM) return null;
  if (!isRecentReading(time.iso, now, MAX_AGE_H)) return null;
  return {
    name: city.name.slice(0, 80),
    km: Math.round(km),
    updatedISO: time.iso,
    pm25: usIndexToUg(iaqi.pm25.v, US_PM25),
    pm10: iaqi.pm10 ? usIndexToUg(iaqi.pm10.v, US_PM10) : null,
  };
}

export async function fetchStation(lat: number, lon: number): Promise<StationReading | null> {
  const token = env().WAQI_TOKEN;
  if (!token) return null;
  try {
    // WAQI only accepts the token as a query parameter. This URL is never logged.
    const url = `https://api.waqi.info/feed/geo:${toGrid(lat).toFixed(2)};${toGrid(lon).toFixed(2)}/?token=${token}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.station),
      next: { revalidate: UPSTREAM_CACHE_S.air },
    });
    if (!res.ok) return null;
    return parseWaqi(await res.json(), lat, lon);
  } catch {
    return null; // never fail the plan because the optional source is down
  }
}
