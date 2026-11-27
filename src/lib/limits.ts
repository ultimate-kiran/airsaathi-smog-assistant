/**
 * Every server-side limit in one place: how often each route may be called, how large a request
 * may be, how long we wait for each upstream service and how long its answers are reused.
 * Changing a number here changes it everywhere it is enforced.
 */

/** Per-client limits for each API route: requests per minute and the largest accepted body. */
export const ROUTE_LIMITS = {
  plan: { perMinute: 20, maxBodyBytes: 8_000 },
  explain: { perMinute: 20, maxBodyBytes: 8_000 },
  ask: { perMinute: 10, maxBodyBytes: 10_000 },
  geocode: { perMinute: 40 },
  reverse: { perMinute: 30 },
} as const;

export type RouteName = keyof typeof ROUTE_LIMITS;

/** The window the per-minute limits count over. */
export const RATE_WINDOW_MS = 60_000;

/** How long to wait for each upstream service before giving up. */
export const UPSTREAM_TIMEOUT_MS = {
  airModel: 8_000,
  station: 5_000,
  places: 6_000,
  rateLimitStore: 1_500,
} as const;

/** How long Next.js may reuse an upstream answer, in seconds. */
export const UPSTREAM_CACHE_S = {
  air: 600,
  placeSearch: 3_600,
  placeName: 86_400,
} as const;
