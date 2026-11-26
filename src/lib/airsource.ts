import { fetchAir, type AirSnapshot } from "./airdata";
import { fetchOpenAq } from "./openaq";
import { applyStation, fetchStation } from "./station";
import type { StationReading } from "./types";

/** A ground-station source: a reading, or null when it has nothing fresh nearby. Never throws. */
export type StationSource = (lat: number, lon: number) => Promise<StationReading | null>;

/** Tried in order; the first one with a reading wins, so later sources only spend quota when needed. */
export const STATION_SOURCES: readonly StationSource[] = [fetchOpenAq, fetchStation];

export async function firstStation(
  lat: number,
  lon: number,
  sources: readonly StationSource[] = STATION_SOURCES,
): Promise<StationReading | null> {
  for (const source of sources) {
    const reading = await source(lat, lon);
    if (reading) return reading;
  }
  return null;
}

/**
 * The one place that decides where air data comes from, shared by /api/plan and /api/ask so the
 * two never show different numbers for the same place.
 *
 * Priority: OpenAQ stations (raw µg/m³, median of the fresh ones), then the nearest WAQI station,
 * then the Open-Meteo model. WAQI is only called when OpenAQ has nothing, which spares its quota.
 *
 * The model request is the only one that can fail the call: it is the baseline the 24-hour curve
 * comes from. The station lookups run alongside it and never reject (they return null instead).
 */
export async function fetchBestAir(lat: number, lon: number): Promise<AirSnapshot> {
  const stationRequest = firstStation(lat, lon);
  const air = await fetchAir(lat, lon); // throws when the model is unreachable
  const station = await stationRequest;
  return station ? applyStation(air, station) : air;
}
