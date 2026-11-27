/**
 * "Use my location", done properly.
 *
 * getCurrentPosition() with default options accepts the first fix the browser has, and
 * browsers often answer first with a coarse Wi-Fi or IP guess (kilometres off) and refine it
 * a few seconds later. Here we ask for high accuracy, refuse cached positions, keep listening
 * briefly and use the most accurate fix we saw, and report how accurate it was.
 */

import { api } from "./client/api";
import type { Lang, Place } from "./types";

export interface Fix {
  lat: number;
  lon: number;
  /** radius of confidence in metres, as reported by the device */
  accuracy: number;
}

export type GeoFailure = "unsupported" | "denied" | "unavailable" | "timeout";

/** GeolocationPositionError codes: 1 PERMISSION_DENIED, 2 POSITION_UNAVAILABLE, 3 TIMEOUT. */
const FAILURE_BY_CODE: Partial<Record<number, GeoFailure>> = { 1: "denied", 2: "unavailable", 3: "timeout" };

export class GeoError extends Error {
  constructor(public readonly kind: GeoFailure) {
    super(kind);
    this.name = "GeoError";
  }
}

type GeoLike = Pick<Geolocation, "watchPosition" | "clearWatch">;

export interface LocateOptions {
  /** stop early once a fix is at least this accurate (metres) */
  goodEnough?: number;
  /** after this long, settle for the best fix seen so far (ms) */
  settleMs?: number;
  /** give up when there is no fix at all after this long (ms) */
  timeoutMs?: number;
}

/** A fix worse than this is the browser guessing from the network, not from GPS or Wi-Fi positioning. */
export const APPROXIMATE_OVER_M = 3000;

export function locate(geo: GeoLike | undefined, opts: LocateOptions = {}): Promise<Fix> {
  const { goodEnough = 100, settleMs = 8000, timeoutMs = 15000 } = opts;
  if (!geo) return Promise.reject(new GeoError("unsupported"));

  return new Promise<Fix>((resolve, reject) => {
    // One state object: callbacks can fire before watchPosition returns, so nothing here may be in a TDZ.
    const s: {
      best: Fix | null;
      settled: boolean;
      watchId?: number;
      settleTimer?: ReturnType<typeof setTimeout>;
      hardTimer?: ReturnType<typeof setTimeout>;
    } = { best: null, settled: false };

    const settleAt = Date.now() + settleMs;
    const stop = () => {
      clearTimeout(s.settleTimer);
      clearTimeout(s.hardTimer);
      if (s.watchId !== undefined) geo.clearWatch(s.watchId);
    };
    const succeed = () => {
      if (s.settled || !s.best) return;
      s.settled = true;
      stop();
      resolve(s.best);
    };
    const fail = (kind: GeoFailure) => {
      if (s.settled) return;
      s.settled = true;
      stop();
      reject(new GeoError(kind));
    };

    s.watchId = geo.watchPosition(
      (p) => {
        const fix: Fix = { lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy };
        if (!s.best || fix.accuracy < s.best.accuracy) s.best = fix;
        if (fix.accuracy <= goodEnough || Date.now() >= settleAt) succeed();
      },
      (e) => {
        // Once there is a fix, an error is usually a blip (the position source changed, Wi-Fi
        // handed over) and the watch keeps going: keep waiting for a better fix instead of
        // giving up early. The settle timer decides when to stop.
        if (s.best) return;
        fail(FAILURE_BY_CODE[e.code] ?? "timeout");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );
    // The callback may have fired synchronously, before the id was stored.
    if (s.settled) {
      geo.clearWatch(s.watchId);
      return;
    }

    s.settleTimer = setTimeout(succeed, settleMs);
    s.hardTimer = setTimeout(() => (s.best ? succeed() : fail("timeout")), timeoutMs + 1000);
  });
}

/** "35 m" under a kilometre, "2.4 km" above. */
export function formatAccuracy(m: number): string {
  return m < 1000 ? `${Math.max(1, Math.round(m))} m` : `${(m / 1000).toFixed(1)} km`;
}

export type Named = Pick<Place, "name" | "short">;

/** The place name for a position, or null when the lookup fails (the caller then keeps a generic label). */
export async function nameFor(lat: number, lon: number, lang: Lang = "en"): Promise<Named | null> {
  try {
    const place = await api.reverse(lat, lon, lang, AbortSignal.timeout(8000));
    return place?.name && place.short ? { name: place.name, short: place.short } : null;
  } catch {
    return null;
  }
}
