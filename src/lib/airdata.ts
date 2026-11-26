import { z } from "zod";
import { categoryFor, indiaAqi } from "./aqi";
import { toGrid } from "./distance";
import type { AirSource, HourPoint } from "./types";

const AirSchema = z.object({
  timezone: z.string().optional(),
  current: z.object({
    time: z.string(),
    pm2_5: z.number().nullable(),
    pm10: z.number().nullable(),
  }),
  hourly: z
    .object({
      time: z.array(z.string()),
      pm2_5: z.array(z.number().nullable()),
      pm10: z.array(z.number().nullable()),
    })
    .refine(({ time, pm2_5, pm10 }) => time.length === pm2_5.length && time.length === pm10.length, {
      message: "Hourly timestamps and pollutant readings must have matching lengths",
    }),
});

export interface AirSnapshot {
  current: HourPoint;
  /** next 24 hourly points starting at the current local hour */
  hours: HourPoint[];
  fetchedAt: string;
  source: AirSource;
}

function fillGaps(values: (number | null)[]): number[] | null {
  const firstValid = values.find((v) => v !== null);
  if (firstValid === undefined || firstValid === null) return null;
  const out: number[] = [];
  let last = firstValid;
  for (const v of values) {
    if (v !== null) last = v;
    out.push(last);
  }
  return out;
}

function makePoint(time: string, pm25: number, pm10: number, isNow: boolean): HourPoint {
  return makeHour({ hour: Number(time.slice(11, 13)), isNow }, pm25, pm10);
}

/** Builds one hour of the forecast from raw concentrations (shared with the station adjustment). */
export function makeHour(base: Pick<HourPoint, "hour" | "isNow">, pm25: number, pm10: number): HourPoint {
  const aqi = indiaAqi(pm25, pm10);
  return { ...base, pm25: Math.round(pm25), pm10: Math.round(pm10), aqi, category: categoryFor(aqi).key };
}

/** Pure transform, exported for tests. */
export function snapshotFromOpenMeteo(raw: unknown): AirSnapshot {
  const parsed = AirSchema.parse(raw);
  const pm25 = fillGaps(parsed.hourly.pm2_5);
  const pm10 = fillGaps(parsed.hourly.pm10);
  if (!pm25 || !pm10) throw new Error("No air quality values available for this location");

  const nowHour = parsed.current.time.slice(0, 13) + ":00";
  let start = parsed.hourly.time.indexOf(nowHour);
  if (start < 0) start = 0;

  const hours: HourPoint[] = [];
  for (let i = start; i < Math.min(start + 24, parsed.hourly.time.length); i++) {
    hours.push(makePoint(parsed.hourly.time[i], pm25[i], pm10[i], i === start));
  }
  if (hours.length < 12) throw new Error("Not enough forecast hours returned");

  const cur = parsed.current;
  const current = cur.pm2_5 !== null && cur.pm10 !== null ? makePoint(cur.time, cur.pm2_5, cur.pm10, true) : hours[0];

  return { current, hours, fetchedAt: new Date().toISOString(), source: { kind: "model" } };
}

export async function fetchAir(lat: number, lon: number): Promise<AirSnapshot> {
  // Round to ~1 km so we never send more precise location than we need.
  const la = toGrid(lat).toFixed(2);
  const lo = toGrid(lon).toFixed(2);
  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${la}&longitude=${lo}&current=pm2_5,pm10&hourly=pm2_5,pm10&forecast_days=2&timezone=auto`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`Air quality service returned ${res.status}`);
  return snapshotFromOpenMeteo(await res.json());
}
