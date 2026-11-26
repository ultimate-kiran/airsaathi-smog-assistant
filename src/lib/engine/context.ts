import type { AirSnapshot } from "../airdata";
import type { HourPoint, Lang, Profile } from "../types";
import { AQI, HOURS, K, TIME } from "./constants";
import { avgFor, bestWindow, mean, type Window } from "./windows";

/** Everything the rules need, worked out once per plan. */
export interface Ctx {
  p: Profile;
  lang: Lang;
  aqi: number;
  pm25: number;
  hours: HourPoint[];
  /** 0-100 urgency of protective actions */
  prot: number;
  sensitive: boolean;
  /** the cleanest window must be at or under these AQI values to recommend going out */
  limits: { exercise: number; vulnerable: number };
  bestExercise: Window | null;
  bestHour: Window | null;
  avg: { early: number; evening: number; rush: number; night: number; day: number };
  /** indoor PM2.5 for a given outdoor value, with this home's windows and purifier */
  indoor: (outdoor: number) => number;
}

export function buildContext(p: Profile, air: AirSnapshot): Ctx {
  const { hours, current } = air;
  const hh = p.household;
  const sensitive = hh.respiratory || hh.heart || hh.pregnant;
  const day = mean(hours.map((h) => h.pm25));
  const exLen = Math.min(TIME.EXERCISE_MAX_WINDOW_H, Math.max(1, Math.ceil(p.exercise.minutes / 60)));
  const infiltration = p.windows === "open" ? K.F_OPEN : K.F_CLOSED;
  return {
    p,
    lang: p.lang,
    aqi: current.aqi,
    pm25: current.pm25,
    hours,
    prot: Math.min(100, current.aqi / 4),
    sensitive,
    limits: {
      exercise: sensitive ? AQI.SENSITIVE_LIMIT : AQI.EXERCISE_LIMIT,
      vulnerable: sensitive ? AQI.SENSITIVE_LIMIT : AQI.VULNERABLE_LIMIT,
    },
    bestExercise: bestWindow(hours, exLen),
    bestHour: bestWindow(hours, 1),
    avg: {
      early: avgFor(hours, HOURS.EARLY, day),
      evening: avgFor(hours, HOURS.EVENING, day),
      rush: avgFor(hours, HOURS.RUSH, day),
      night: avgFor(hours, HOURS.NIGHT, day),
      day,
    },
    indoor: (out) => out * infiltration * (p.hasPurifier ? 1 - K.PURIFIER_CUT : 1),
  };
}
