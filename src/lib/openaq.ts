import { z } from "zod";
import { haversineKm, toGrid } from "./distance";
import { UPSTREAM_CACHE_S, UPSTREAM_TIMEOUT_MS } from "./limits";
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
/** OpenAQ's parameter id for PM2.5. */
const PM25_PARAMETER_ID = 2;

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

/** True when this sensor reports the given pollutant in µg/m³ (some report ppm or other units). */
function measuresInUg(sensor: OpenAqLocation["sensors"][number], pollutant: string): boolean {
  return sensor.parameter.name === pollutant && sensor.parameter.units === "µg/m³";
}

/** Candidates worth a /latest call: fresh, within range, and carrying a µg/m³ PM2.5 sensor. */
export function pickLocations(raw: unknown, lat: number, lon: number, now = new Date()): OpenAqLocation[] {
  const parsed = LocationsSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.results
    .filter((location) => {
      const lastSeen = location.datetimeLast?.utc;
      if (!lastSeen || !isRecentReading(lastSeen, now, MAX_AGE_H)) return false;
      return location.sensors.some((sensor) => measuresInUg(sensor, "pm25"));
    })
    .map((location) => ({
      location,
      km: haversineKm(lat, lon, location.coordinates.latitude, location.coordinates.longitude),
    }))
    .filter(({ km }) => km <= RADIUS_M / 1000)
    .sort((a, b) => a.km - b.km)
    .slice(0, MAX_LOCATIONS)
    .map(({ location }) => location);
}

/** Freshest valid value for one pollutant at one location (a location can hold several sensors). */
function freshest(location: OpenAqLocation, latest: OpenAqLatest, pollutant: string, now: Date) {
  const sensorIds = new Set(
    location.sensors.filter((sensor) => measuresInUg(sensor, pollutant)).map((sensor) => sensor.id),
  );
  return latest
    .filter((reading) => sensorIds.has(reading.sensorsId))
    .filter((reading) => reading.value !== null && reading.value >= 0 && reading.value <= PM25_MAX)
    .filter((reading) => isRecentReading(reading.datetime.utc, now, MAX_AGE_H))
    .sort((a, b) => Date.parse(b.datetime.utc) - Date.parse(a.datetime.utc))[0];
}

/** Pure: turn one location plus its latest values into a candidate, or null if nothing usable. */
export function toCandidate(
  location: OpenAqLocation,
  latest: unknown,
  from: { lat: number; lon: number },
  now = new Date(),
): OpenAqCandidate | null {
  const parsed = LatestSchema.safeParse(latest);
  if (!parsed.success) return null;
  const pm25 = freshest(location, parsed.data.results, "pm25", now);
  if (!pm25 || pm25.value === null) return null;
  const pm10 = freshest(location, parsed.data.results, "pm10", now);
  const { latitude, longitude } = location.coordinates;
  return {
    name: (location.name ?? "Station").trim().slice(0, 80) || "Station",
    km: Math.round(haversineKm(from.lat, from.lon, latitude, longitude)),
    monitor: location.isMonitor === true,
    pm25: pm25.value,
    pm10: pm10?.value ?? null,
    updatedISO: pm25.datetime.utc,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Pure: combine candidates into one reading.
 * Uncertain when only one station backs the number, only low-cost sensors exist, or the
 * fresh stations disagree by more than DISAGREE_RATIO.
 */
export function aggregate(candidates: OpenAqCandidate[]): StationReading | null {
  if (candidates.length === 0) return null;
  const monitors = candidates.filter((candidate) => candidate.monitor);
  const used = monitors.length > 0 ? monitors : candidates;
  const allPm25 = candidates.map((candidate) => candidate.pm25);
  const spread = Math.max(...allPm25) / Math.max(Math.min(...allPm25), 1);
  const pm10s = used.map((candidate) => candidate.pm10).filter((value): value is number => value !== null);
  const newest = used.reduce((a, b) => (Date.parse(a.updatedISO) >= Date.parse(b.updatedISO) ? a : b));
  return {
    name: used.length === 1 ? used[0].name : `${used.length} stations`,
    km: Math.max(...used.map((candidate) => candidate.km)),
    updatedISO: newest.updatedISO,
    pm25: median(used.map((candidate) => candidate.pm25)),
    pm10: pm10s.length > 0 ? median(pm10s) : null,
    count: used.length,
    uncertain: used.length === 1 || monitors.length === 0 || spread > DISAGREE_RATIO,
  };
}

/** GET from the OpenAQ v3 API. The key goes in a header, never in the URL. */
async function getJson(path: string, apiKey: string): Promise<unknown> {
  const res = await fetch(`https://api.openaq.org/v3${path}`, {
    headers: { "X-API-Key": apiKey },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.station),
    next: { revalidate: UPSTREAM_CACHE_S.air },
  });
  if (!res.ok) throw new Error(`OpenAQ ${res.status}`);
  return res.json();
}

export async function fetchOpenAq(lat: number, lon: number): Promise<StationReading | null> {
  const apiKey = env().OPENAQ_API_KEY;
  if (!apiKey) return null;
  try {
    const query = `coordinates=${toGrid(lat).toFixed(2)},${toGrid(lon).toFixed(2)}&radius=${RADIUS_M}&parameters_id=${PM25_PARAMETER_ID}&limit=20`;
    const locations = pickLocations(await getJson(`/locations?${query}`, apiKey), lat, lon);
    const latest = await Promise.allSettled(
      locations.map((location) => getJson(`/locations/${location.id}/latest`, apiKey)),
    );
    const candidates = locations.flatMap((location, i) => {
      const result = latest[i];
      if (result.status !== "fulfilled") return [];
      return toCandidate(location, result.value, { lat, lon }) ?? [];
    });
    return aggregate(candidates);
  } catch {
    return null; // never fail the plan because an optional source is down
  }
}
