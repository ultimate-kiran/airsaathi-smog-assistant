import { ProfileSchema, type Profile } from "./types";

const PROFILE_KEY = "airsaathi.profile.v1";
const DONE_KEY = "airsaathi.done.v1";

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
export function saveProfile(p: Profile) {
  write(PROFILE_KEY, p);
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
export function saveDone(d: DoneLog) {
  // keep two months at most
  const keys = Object.keys(d).sort().slice(-60);
  const trimmed: DoneLog = {};
  for (const k of keys) trimmed[k] = d[k];
  write(DONE_KEY, trimmed);
}

export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(localDate(d));
  }
  return out;
}

export function streak(log: DoneLog): number {
  let count = 0;
  const d = new Date();
  // today may still be empty; the streak is alive if yesterday has entries
  if (!(log[localDate(d)]?.length > 0)) d.setDate(d.getDate() - 1);
  while (log[localDate(d)]?.length > 0) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
