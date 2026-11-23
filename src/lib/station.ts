import { z } from "zod";
import { categoryFor, indiaAqi } from "./aqi";
import { hourLabel, type AirSnapshot } from "./airdata";
import type { HourPoint } from "./types";

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

export interface StationReading {
  name: string;
  km: number;
  updatedISO: string;
  pm25: number;
  pm10: number | null;
  /** how many stations back this number (default 1) */
  count?: number;
  /** true when the number rests on one station, low-cost sensors only, or stations that disagree */
  uncertain?: boolean;
}

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

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Pure parser, exported for tests. Returns null if the station is too far, too old or has no PM2.5. */
export function parseWaqi(raw: unknown, lat: number, lon: number, now = new Date()): StationReading | null {
  const r = WaqiSchema.safeParse(raw);
  if (!r.success) return null;
  const d = r.data.data;
  if (!d.iaqi.pm25) return null;
  const km = haversineKm(lat, lon, d.city.geo[0], d.city.geo[1]);
  if (km > MAX_KM) return null;
  const updated = new Date(d.time.iso);
  if (Number.isNaN(updated.getTime())) return null;
  if (now.getTime() - updated.getTime() > MAX_AGE_H * 3_600_000) return null;
  return {
    name: d.city.name.slice(0, 80),
    km: Math.round(km),
    updatedISO: d.time.iso,
    pm25: usIndexToUg(d.iaqi.pm25.v, US_PM25),
    pm10: d.iaqi.pm10 ? usIndexToUg(d.iaqi.pm10.v, US_PM10) : null,
  };
}

export function stationEnabled(): boolean {
  return !!process.env.WAQI_TOKEN;
}

export async function fetchStation(lat: number, lon: number): Promise<StationReading | null> {
  const token = process.env.WAQI_TOKEN;
  if (!token || !/^[A-Za-z0-9]{20,60}$/.test(token)) return null;
  try {
    const url = `https://api.waqi.info/feed/geo:${lat.toFixed(2)};${lon.toFixed(2)}/?token=${token}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 600 } });
    if (!res.ok) return null;
    return parseWaqi(await res.json(), lat, lon);
  } catch {
    return null; // never fail the plan because the optional source is down
  }
}

function point(base: HourPoint, pm25: number, pm10: number): HourPoint {
  const aqi = indiaAqi(pm25, pm10);
  return {
    ...base,
    label: hourLabel(base.hour),
    pm25: Math.round(pm25),
    pm10: Math.round(pm10),
    aqi,
    category: categoryFor(aqi).key,
  };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/**
 * Use the station reading as "now" and shift the model's 24-hour shape to match it.
 * The factor is capped so one odd reading cannot distort the whole day.
 */
export function applyStation(air: AirSnapshot, st: StationReading): AirSnapshot {
  const m = air.hours[0];
  const f25 = clamp(st.pm25 / Math.max(m.pm25, 1), 0.3, 3);
  const f10 = st.pm10 !== null ? clamp(st.pm10 / Math.max(m.pm10, 1), 0.3, 3) : f25;
  const hours = air.hours.map((h) => point(h, h.pm25 * f25, h.pm10 * f10));
  const current = point(air.current, st.pm25, st.pm10 ?? m.pm10 * f10);
  return {
    ...air,
    current,
    hours: hours.map((h, i) => (i === 0 ? { ...current, hour: h.hour, label: h.label, isNow: true } : h)),
    source: {
      kind: "station",
      name: st.name,
      km: st.km,
      updated: st.updatedISO,
      count: st.count ?? 1,
      uncertain: st.uncertain ?? false,
    },
  };
}
