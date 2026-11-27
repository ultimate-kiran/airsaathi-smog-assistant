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
  if (!Number.isInteger(len) || len < 1) return null;
  let best: Window | null = null;
  for (let i = 0; i + len <= hours.length; i++) {
    const slice = hours.slice(i, i + len);
    const consecutive = slice.every((h, j) => h.hour === slice[0].hour + j);
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

/** Hours within this share of the day's peak count as part of the bad stretch. */
const NEAR_PEAK = 0.85;
/** A stretch this long covers practically the whole forecast day. */
const ALL_DAY_HOURS = 22;

/** The longest run of consecutive `true` values, as [start, end) indices. */
function longestRun(flags: boolean[]): [number, number] | null {
  let best: [number, number] | null = null;
  let start = -1;
  for (let i = 0; i <= flags.length; i++) {
    const hit = i < flags.length && flags[i];
    if (hit && start < 0) start = i;
    if (!hit && start >= 0) {
      if (!best || i - start > best[1] - best[0]) best = [start, i];
      start = -1;
    }
  }
  return best;
}

/** Longest stretch near the day's peak, if the peak is above `limit`. */
export function worstStretch(hours: HourPoint[], limit: number): PlanResponse["avoid"] {
  const maxAqi = Math.max(...hours.map((h) => h.aqi));
  if (maxAqi <= limit) return null;
  const threshold = Math.max(limit, NEAR_PEAK * maxAqi);
  const run = longestRun(hours.map((h) => h.aqi >= threshold));
  if (!run) return null;
  const [a, b] = run;
  return { start: hours[a].hour, end: (hours[b - 1].hour + 1) % 24, allDay: b - a >= ALL_DAY_HOURS };
}
