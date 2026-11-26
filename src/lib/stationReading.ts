import { makeHour, type AirSnapshot } from "./airdata";
import type { StationReading } from "./types";

export function isRecentReading(iso: string, now: Date, maxHours: number): boolean {
  const ageMs = now.getTime() - Date.parse(iso);
  return ageMs >= 0 && ageMs <= maxHours * 3_600_000;
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
  const hours = air.hours.map((h) => makeHour(h, h.pm25 * f25, h.pm10 * f10));
  const current = makeHour(air.current, st.pm25, st.pm10 ?? m.pm10 * f10);
  return {
    ...air,
    current,
    hours: hours.map((h, i) => (i === 0 ? { ...current, hour: h.hour, isNow: true } : h)),
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
