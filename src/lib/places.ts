import { z } from "zod";
import { TtlCache } from "./cache";
import { toGrid } from "./distance";
import { AppError } from "./errors";
import type { RateLimiter } from "./ratelimit";
import { AddressSchema, placeName } from "./placename";
import type { Lang, Place } from "./types";

/** Forward search (Open-Meteo) and reverse lookup (OpenStreetMap Nominatim) for Indian places. */

export type { Place };

const SearchSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        admin1: z.string().optional(),
        country: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
      }),
    )
    .optional(),
});

export async function searchPlaces(q: string): Promise<Place[]> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json&countryCode=IN`,
      { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } },
    );
    if (!res.ok) throw new Error("upstream");
    const data = SearchSchema.parse(await res.json());
    return (data.results ?? []).map((r) => ({
      name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      short: r.name,
      lat: r.latitude,
      lon: r.longitude,
    }));
  } catch {
    throw new AppError("lookup_unavailable");
  }
}

export const inIndia = (lat: number, lon: number) => lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98;

/**
 * Nominatim allows one request per second for the whole application, not per user.
 * Within an instance, calls queue up a second apart; with a shared Redis configured, the limit
 * also holds across instances (a busy second is retried once, then the lookup gives up and the
 * app keeps its generic "Your location" label).
 */
export class Throttle {
  private last = 0;
  private chain: Promise<void> = Promise.resolve();
  constructor(public intervalMs: number) {}

  wait(): Promise<void> {
    const next = this.chain.then(async () => {
      const gap = this.last + this.intervalMs - Date.now();
      if (gap > 0) await new Promise((r) => setTimeout(r, gap));
      this.last = Date.now();
    });
    this.chain = next.catch(() => {});
    return next;
  }
}

const ResultSchema = z.object({ address: AddressSchema.optional() });

async function lookupAddress(lat: number, lon: number, lang: Lang): Promise<Place | null> {
  let data: z.infer<typeof ResultSchema>;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=${lang === "hi" ? "hi,en" : "en"}&lat=${lat}&lon=${lon}`,
      { headers: { "User-Agent": "AirSaathi-smog-assistant" }, signal: AbortSignal.timeout(6000), next: { revalidate: 86_400 } },
    );
    if (!res.ok) throw new Error("upstream");
    data = ResultSchema.parse(await res.json());
  } catch {
    throw new AppError("lookup_unavailable");
  }
  if (data.address?.country_code && data.address.country_code !== "in") throw new AppError("outside_india");
  const named = data.address ? placeName(data.address) : null;
  return named ? { ...named, lat, lon } : null;
}

export interface PlaceServiceDeps {
  /** cross-instance limiter, or null when only this instance counts */
  shared: () => RateLimiter | null;
  lookup?: (lat: number, lon: number, lang: Lang) => Promise<Place | null>;
  gate?: Pick<Throttle, "wait" | "intervalMs">;
  ttlMs?: number;
}

export type PlaceService = ReturnType<typeof createPlaceService>;

/** Reverse lookups with their cache and throttle; container.ts wires the real one. */
export function createPlaceService({
  shared,
  gate = new Throttle(1100),
  lookup = lookupAddress,
  ttlMs = 24 * 3_600_000,
}: PlaceServiceDeps) {
  const cache = new TtlCache<Place | null>(2000);

  /** Across instances (only when a shared store exists; within one, the Throttle already spaces calls). */
  async function globalSlot(): Promise<boolean> {
    const s = shared();
    if (!s || (await s.hit("nominatim", 1, gate.intervalMs))) return true;
    await new Promise((r) => setTimeout(r, gate.intervalMs));
    return s.hit("nominatim", 1, gate.intervalMs);
  }

  /** Place name for ~1 km rounded coordinates, or null when the point has no name. */
  function reverse(lat: number, lon: number, lang: Lang): Promise<Place | null> {
    const rlat = toGrid(lat);
    const rlon = toGrid(lon);
    return cache.getOrLoad(`${rlat},${rlon},${lang}`, ttlMs, async () => {
      await gate.wait();
      if (!(await globalSlot())) throw new AppError("lookup_unavailable");
      return lookup(rlat, rlon, lang);
    });
  }

  return { search: searchPlaces, reverse, gate, reset: () => cache.clear() };
}
