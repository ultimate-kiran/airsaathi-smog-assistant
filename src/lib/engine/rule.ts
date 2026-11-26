import { formatRange } from "../format";
import type { ActionGroup, ActionOut, Bilingual, HourRange, Impact } from "../types";
import type { Ctx } from "./context";
import type { Window } from "./windows";

/**
 * A rule looks at the household and the day's air and either proposes one action or stays silent.
 * Adding advice means adding a rule to rules/index.ts; nothing else changes.
 */
export type Rule = (c: Ctx) => ActionOut | null;

export const L = (en: string, hi: string): Bilingual => ({ en, hi });
export const r0 = (n: number) => Math.round(n);
export const pct = (fraction: number) => Math.round(fraction * 100);

/** The same hour range, formatted for each language, for use inside bilingual text. */
export const range = (w: HourRange): Bilingual => ({ en: formatRange(w, "en"), hi: formatRange(w, "hi") });

export const WHO = {
  everyone: L("Everyone", "सभी"),
  kids: L("Children", "बच्चे"),
  elders: L("Older adults", "बुज़ुर्ग"),
  sensitive: L("Anyone with asthma, heart disease or pregnancy", "दमा, दिल की बीमारी या गर्भावस्था वाले"),
  commuter: L("Commuter", "आने-जाने वाले"),
  exerciser: L("Whoever exercises outdoors", "बाहर कसरत करने वाले"),
  cook: L("Whoever cooks", "खाना बनाने वाले"),
};

export interface ActionSpec {
  id: string;
  group: ActionGroup;
  exclusive?: string;
  priority: number;
  title: Bilingual;
  why: Bilingual;
  impact?: Impact;
  assumption?: Bilingual;
  window?: HourRange;
  forWhom: Bilingual[];
}

/** Turns a bilingual spec into the action for the reader's language. */
export function makeAction(c: Ctx, o: ActionSpec): ActionOut {
  const lang = c.lang;
  return {
    id: o.id,
    group: o.group,
    exclusive: o.exclusive,
    counted: true, // settled by markCounted once all actions are ranked
    priority: Math.round(Math.min(100, o.priority)),
    title: o.title[lang],
    why: o.why[lang],
    impact: o.impact ?? {},
    assumption: o.assumption ? o.assumption[lang] : "",
    window: o.window ? { start: o.window.start, end: o.window.end } : undefined,
    forWhom: o.forWhom.map((w) => w[lang]),
  };
}

/**
 * The shape shared by children's play, older adults' walks and exercise: if today's cleanest
 * window is clean enough, go out then; otherwise move the activity indoors.
 */
export interface OutdoorActivity {
  /** the window to consider, or null when no daytime window exists */
  best: Window | null;
  /** AQI at or under which going out in the window is fine */
  limit: number;
  /** breathing rate during the activity, m³/h */
  vent: number;
  /** hours spent on the activity */
  hours: number;
  /** PM2.5 at the time people usually do it, for the "versus" comparison */
  usualPm25: number;
  window: (best: Window, avoidedUg: number) => ActionSpec;
  indoors: (outdoorPm25: number, indoorPm25: number, bestAqi: number, avoidedUg: number) => ActionSpec;
}

export function outdoorOrIndoors(c: Ctx, a: OutdoorActivity): ActionOut {
  if (a.best && a.best.aqi <= a.limit) {
    const avoided = Math.max(0, (a.usualPm25 - a.best.avgPm25) * a.vent * a.hours);
    return makeAction(c, a.window(a.best, avoided));
  }
  const outdoor = a.best ? a.best.avgPm25 : c.pm25;
  const inside = c.indoor(outdoor);
  const avoided = Math.max(0, (outdoor - inside) * a.vent * a.hours);
  return makeAction(c, a.indoors(outdoor, inside, a.best ? a.best.aqi : c.aqi, avoided));
}
