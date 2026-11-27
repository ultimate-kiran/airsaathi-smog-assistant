import { ProfileSchema, type Profile } from "./types";

const PROFILE_KEY = "airsaathi.profile.v1";
const DONE_KEY = "airsaathi.done.v1";
/** Days of "I did this" history kept in the browser: about two months. */
const DONE_LOG_MAX_DAYS = 60;

export interface DoneEntry {
  id: string;
  ug: number;
  co2: number;
}
export type DoneLog = Record<string, DoneEntry[]>;

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or storage full: the app works without persistence */
  }
}

export function loadProfile(): Profile | null {
  const parsed = ProfileSchema.safeParse(read(PROFILE_KEY));
  return parsed.success ? parsed.data : null;
}
export function saveProfile(profile: Profile) {
  write(PROFILE_KEY, profile);
}

export function loadDone(): DoneLog {
  const raw = read(DONE_KEY);
  if (!raw || typeof raw !== "object") return {};
  const out: DoneLog = {};
  for (const [day, entries] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(entries)) continue;
    out[day] = entries
      .filter((e): e is DoneEntry => !!e && typeof e.id === "string" && Number.isFinite(e.ug) && Number.isFinite(e.co2))
      .map((e) => ({ id: e.id.slice(0, 40), ug: e.ug, co2: e.co2 }));
  }
  return out;
}
export function saveDone(log: DoneLog) {
  const recentDays = Object.keys(log).sort().slice(-DONE_LOG_MAX_DAYS);
  const trimmed: DoneLog = {};
  for (const day of recentDays) trimmed[day] = log[day];
  write(DONE_KEY, trimmed);
}

/** YYYY-MM-DD in the user's own time zone (toISOString would give the UTC date). */
export function localDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The last `count` local dates, oldest first, ending today. */
export function lastNDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let back = count - 1; back >= 0; back--) {
    const date = new Date(now);
    date.setDate(now.getDate() - back);
    days.push(localDate(date));
  }
  return days;
}

/** Consecutive days with at least one action done, counting back from today (or yesterday). */
export function streak(log: DoneLog): number {
  let count = 0;
  const day = new Date();
  // today may still be empty; the streak is alive if yesterday has entries
  if (!(log[localDate(day)]?.length > 0)) day.setDate(day.getDate() - 1);
  while (log[localDate(day)]?.length > 0) {
    count++;
    day.setDate(day.getDate() - 1);
  }
  return count;
}
