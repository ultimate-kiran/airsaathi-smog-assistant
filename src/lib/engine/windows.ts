import { indiaAqi } from "../aqi";
import type { HourPoint, HourRange, PlanResponse } from "../types";
import { HOURS } from "./constants";

/** A run of hours with its average air. */
export interface Window extends HourRange {
  avgPm25: number;
  aqi: number;
}

export function mean(xs: readonly number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Average PM2.5 over the given local hours, or `fallback` when none are in the forecast. */
export function avgFor(hours: HourPoint[], hs: readonly number[], fallback: number): number {
  const vals = hours.filter((h) => hs.includes(h.hour)).map((h) => h.pm25);
  return vals.length ? mean(vals) : fallback;
}

/** Cleanest run of `len` consecutive daytime hours (06:00 to 20:00). */
export function bestWindow(hours: HourPoint[], len: number): Window | null {
  let best: Window | null = null;
  for (let i = 0; i + len <= hours.length; i++) {
    const slice = hours.slice(i, i + len);
    const consecutive = slice.every((h, j) => h.hour === (slice[0].hour + j) % 24);
    const daytime = slice[0].hour >= HOURS.DAY_FIRST && slice[len - 1].hour <= HOURS.DAY_LAST;
    if (!consecutive || !daytime) continue;
    const avgPm25 = mean(slice.map((h) => h.pm25));
    if (!best || avgPm25 < best.avgPm25) {
      const start = slice[0].hour;
      best = { start, end: (start + len) % 24, avgPm25, aqi: indiaAqi(avgPm25, mean(slice.map((h) => h.pm10))) };
    }
  }
  return best;
}

/** Longest stretch near the day's peak, if the peak is above `limit`. */
export function worstStretch(hours: HourPoint[], limit: number): PlanResponse["avoid"] {
  const maxAqi = Math.max(...hours.map((h) => h.aqi));
  if (maxAqi <= limit) return null;
  const threshold = Math.max(limit, 0.85 * maxAqi);
  let bestRun: [number, number] | null = null;
  let runStart = -1;
  for (let i = 0; i <= hours.length; i++) {
    const hit = i < hours.length && hours[i].aqi >= threshold;
    if (hit && runStart < 0) runStart = i;
    if (!hit && runStart >= 0) {
      if (!bestRun || i - runStart > bestRun[1] - bestRun[0]) bestRun = [runStart, i];
      runStart = -1;
    }
  }
  if (!bestRun) return null;
  const [a, b] = bestRun;
  return { start: hours[a].hour, end: (hours[b - 1].hour + 1) % 24, allDay: b - a >= 22 };
}
