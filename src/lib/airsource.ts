import { fetchAir, type AirSnapshot } from "./airdata";
import { fetchOpenAq } from "./openaq";
import { applyStation, fetchStation } from "./station";

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
  const stationRequest = fetchOpenAq(lat, lon).then((s) => s ?? fetchStation(lat, lon));
  const air = await fetchAir(lat, lon); // throws when the model is unreachable
  const station = await stationRequest;
  return station ? applyStation(air, station) : air;
}
