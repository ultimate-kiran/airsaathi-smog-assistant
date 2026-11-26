import { z } from "zod";
import { haversineKm, toGrid } from "./distance";
import { isRecentReading } from "./stationReading";
import { env } from "./env";
import type { StationReading } from "./types";

/**
 * Optional ground-station readings from OpenAQ v3 (https://openaq.org), enabled by OPENAQ_API_KEY.
 * OpenAQ returns raw µg/m³, so unlike WAQI there is no index conversion step.
 *
 * Design rules, each one learned from real Kochi data:
 *  - Only readings from the last 3 hours count (two Kochi monitors have been silent since 2022).
 *  - Only µg/m³ PM2.5 sensors in a plausible range count.
 *  - Reference monitors (`isMonitor`) win over low-cost sensors, which can read several times
 *    higher. If both exist and disagree, we still use the monitors but flag the result uncertain.
 *  - With several fresh stations we use the median, so one faulty station cannot move the result.
 */

const RADIUS_M = 25_000; // OpenAQ v3 caps the search radius at 25 km
const MAX_AGE_H = 3;
const MAX_LOCATIONS = 5; // nearest candidates whose latest values we fetch (keeps calls per plan low)
const PM25_MAX = 1000;
const DISAGREE_RATIO = 2.5;

const LocationsSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string().nullish(),
      isMonitor: z.boolean().nullish(),
      coordinates: z.object({ latitude: z.number(), longitude: z.number() }),
      datetimeLast: z.object({ utc: z.string() }).nullish(),
      sensors: z.array(z.object({ id: z.number(), parameter: z.object({ name: z.string(), units: z.string() }) })),
    }),
  ),
});

const LatestSchema = z.object({
  results: z.array(
    z.object({ value: z.number().nullable(), sensorsId: z.number(), datetime: z.object({ utc: z.string() }) }),
  ),
});

export type OpenAqLocation = z.infer<typeof LocationsSchema>["results"][number];
export type OpenAqLatest = z.infer<typeof LatestSchema>["results"];

export interface OpenAqCandidate {
  name: string;
  km: number;
  monitor: boolean;
  pm25: number;
  pm10: number | null;
  updatedISO: string;
}

/** Candidates worth a /latest call: fresh, within range, and carrying a µg/m³ PM2.5 sensor. */
export function pickLocations(raw: unknown, lat: number, lon: number, now = new Date()): OpenAqLocation[] {
  const r = LocationsSchema.safeParse(raw);
  if (!r.success) return [];
  return r.data.results
    .filter((l) => {
      const last = l.datetimeLast?.utc;
      if (!last || !isRecentReading(last, now, MAX_AGE_H)) return false;
      return l.sensors.some((s) => s.parameter.name === "pm25" && s.parameter.units === "µg/m³");
    })
    .map((l) => ({ l, km: haversineKm(lat, lon, l.coordinates.latitude, l.coordinates.longitude) }))
    .filter((x) => x.km <= RADIUS_M / 1000)
    .sort((a, b) => a.km - b.km)
    .slice(0, MAX_LOCATIONS)
    .map((x) => x.l);
}

/** Freshest valid value for one parameter at one location (a location can hold several sensors). */
function freshest(loc: OpenAqLocation, latest: OpenAqLatest, param: string, now: Date) {
  const ids = new Set(
    loc.sensors.filter((s) => s.parameter.name === param && s.parameter.units === "µg/m³").map((s) => s.id),
  );
  return latest
    .filter((x) => ids.has(x.sensorsId) && x.value !== null && x.value >= 0 && x.value <= PM25_MAX)
    .filter((x) => isRecentReading(x.datetime.utc, now, MAX_AGE_H))
    .sort((a, b) => Date.parse(b.datetime.utc) - Date.parse(a.datetime.utc))[0];
}

/** Pure: turn one location plus its latest values into a candidate, or null if nothing usable. */
export function toCandidate(
  loc: OpenAqLocation,
  latest: unknown,
  lat: number,
  lon: number,
  now = new Date(),
): OpenAqCandidate | null {
  const r = LatestSchema.safeParse(latest);
  if (!r.success) return null;
  const pm25 = freshest(loc, r.data.results, "pm25", now);
  if (!pm25 || pm25.value === null) return null;
  const pm10 = freshest(loc, r.data.results, "pm10", now);
  return {
    name: (loc.name ?? "Station").trim().slice(0, 80) || "Station",
    km: Math.round(haversineKm(lat, lon, loc.coordinates.latitude, loc.coordinates.longitude)),
    monitor: loc.isMonitor === true,
    pm25: pm25.value,
    pm10: pm10?.value ?? null,
    updatedISO: pm25.datetime.utc,
  };
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Pure: combine candidates into one reading.
 * Uncertain when only one station backs the number, only low-cost sensors exist, or the
 * fresh stations disagree by more than DISAGREE_RATIO.
 */
export function aggregate(cands: OpenAqCandidate[]): StationReading | null {
  if (cands.length === 0) return null;
  const monitors = cands.filter((c) => c.monitor);
  const used = monitors.length > 0 ? monitors : cands;
  const all = cands.map((c) => c.pm25);
  const ratio = Math.max(...all) / Math.max(Math.min(...all), 1);
  const pm10s = used.map((c) => c.pm10).filter((v): v is number => v !== null);
  const newest = used.reduce((a, b) => (Date.parse(a.updatedISO) >= Date.parse(b.updatedISO) ? a : b));
  return {
    name: used.length === 1 ? used[0].name : `${used.length} stations`,
    km: Math.max(...used.map((c) => c.km)),
    updatedISO: newest.updatedISO,
    pm25: median(used.map((c) => c.pm25)),
    pm10: pm10s.length > 0 ? median(pm10s) : null,
    count: used.length,
    uncertain: used.length === 1 || monitors.length === 0 || ratio > DISAGREE_RATIO,
  };
}

async function get(path: string, key: string): Promise<unknown> {
  const res = await fetch(`https://api.openaq.org/v3${path}`, {
    headers: { "X-API-Key": key }, // header only, never in the URL
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 600 },
  });
  if (!res.ok) throw new Error(`OpenAQ ${res.status}`);
  return res.json();
}

export async function fetchOpenAq(lat: number, lon: number): Promise<StationReading | null> {
  const key = env().OPENAQ_API_KEY;
  if (!key) return null;
  try {
    const q = `coordinates=${toGrid(lat).toFixed(2)},${toGrid(lon).toFixed(2)}&radius=${RADIUS_M}&parameters_id=2&limit=20`;
    const locs = pickLocations(await get(`/locations?${q}`, key), lat, lon);
    const settled = await Promise.allSettled(locs.map((l) => get(`/locations/${l.id}/latest`, key)));
    const cands: OpenAqCandidate[] = [];
    settled.forEach((s, i) => {
      if (s.status !== "fulfilled") return;
      const c = toCandidate(locs[i], s.value, lat, lon);
      if (c) cands.push(c);
    });
    return aggregate(cands);
  } catch {
    return null; // never fail the plan because an optional source is down
  }
}
