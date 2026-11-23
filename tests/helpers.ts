import type { Profile } from "../src/lib/types";

export const PROFILE: Profile = {
  lat: 9.94,
  lon: 76.26,
  place: "Kochi",
  lang: "en",
  household: { adults: 2, children: 1, elders: 1, respiratory: false, heart: false, pregnant: false },
  commute: { mode: "car", km: 12 },
  cooking: "lpg",
  heating: "none",
  hasPurifier: false,
  windows: "open",
  exercise: { outdoor: true, minutes: 40 },
};

/** An Open-Meteo air-quality payload with a flat PM level for 48 hours. */
export function openMeteoPayload(pm25 = 90, pm10 = 120) {
  const time = Array.from(
    { length: 48 },
    (_, i) => `2026-11-${20 + Math.floor(i / 24)}T${String(i % 24).padStart(2, "0")}:00`,
  );
  return {
    timezone: "Asia/Kolkata",
    current: { time: "2026-11-20T10:30", pm2_5: pm25, pm10 },
    hourly: { time, pm2_5: time.map(() => pm25), pm10: time.map(() => pm10) },
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

let n = 0;
/** Each request gets its own client IP so the in-memory rate limiter never leaks between tests. */
export function post(url: string, body: unknown, ip = `10.0.0.${++n}`): Request {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
