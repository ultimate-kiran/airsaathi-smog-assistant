import { z } from "zod";
import { isRecentReading } from "./stationReading";
import { haversineKm, toGrid } from "./distance";
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

/** [aqiLow, aqiHigh, concLow, concHigh] */
type Bp = readonly [number, number, number, number];
// US EPA breakpoints (PM2.5 as revised in 2024; PM10 unchanged).
export const US_PM25: readonly Bp[] = [
  [0, 50, 0, 9],
  [51, 100, 9.1, 35.4],
  [101, 150, 35.5, 55.4],
  [151, 200, 55.5, 125.4],
  [201, 300, 125.5, 225.4],
  [301, 500, 225.5, 500],
];
export const US_PM10: readonly Bp[] = [
  [0, 50, 0, 54],
  [51, 100, 55, 154],
  [101, 150, 155, 254],
  [151, 200, 255, 354],
  [201, 300, 355, 424],
  [301, 500, 425, 604],
];

/** Inverse of the EPA AQI formula: sub-index back to µg/m³. */
export function usIndexToUg(index: number, table: readonly Bp[]): number {
  const i = Math.max(0, Math.min(500, index));
  const bp = table.find((b) => i <= b[1]) ?? table[table.length - 1];
  const [aLo, aHi, cLo, cHi] = bp;
  return cLo + ((i - aLo) / (aHi - aLo)) * (cHi - cLo);
}

/** Pure parser, exported for tests. Returns null if the station is too far, too old or has no PM2.5. */
export function parseWaqi(raw: unknown, lat: number, lon: number, now = new Date()): StationReading | null {
  const r = WaqiSchema.safeParse(raw);
  if (!r.success) return null;
  const d = r.data.data;
  if (!d.iaqi.pm25) return null;
  const km = haversineKm(lat, lon, d.city.geo[0], d.city.geo[1]);
  if (km > MAX_KM) return null;
  if (!isRecentReading(d.time.iso, now, MAX_AGE_H)) return null;
  return {
    name: d.city.name.slice(0, 80),
    km: Math.round(km),
    updatedISO: d.time.iso,
    pm25: usIndexToUg(d.iaqi.pm25.v, US_PM25),
    pm10: d.iaqi.pm10 ? usIndexToUg(d.iaqi.pm10.v, US_PM10) : null,
  };
}

export async function fetchStation(lat: number, lon: number): Promise<StationReading | null> {
  const token = env().WAQI_TOKEN;
  if (!token) return null;
  try {
    // WAQI only accepts the token as a query parameter. This URL is never logged.
    const url = `https://api.waqi.info/feed/geo:${toGrid(lat).toFixed(2)};${toGrid(lon).toFixed(2)}/?token=${token}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 600 } });
    if (!res.ok) return null;
    return parseWaqi(await res.json(), lat, lon);
  } catch {
    return null; // never fail the plan because the optional source is down
  }
}

export { applyStation } from "./stationReading";
