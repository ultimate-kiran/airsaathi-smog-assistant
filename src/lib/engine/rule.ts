import type { ActionGroup, ActionOut, Bilingual, HourRange, Impact } from "../types";
import type { ActionText } from "./copy";
import type { Ctx } from "./context";
import { priorityOf, type ActionId } from "./priorities";
import type { Window } from "./windows";

/**
 * A rule looks at the household and the day's air and either proposes one action or stays silent.
 * Rules decide and compute; their words come from copy.ts and their rank from priorities.ts.
 * Adding advice means adding a rule to rules/index.ts; nothing else changes.
 */
export type Rule = (c: Ctx) => ActionOut | null;

export interface ActionSpec {
  id: ActionId;
  group: ActionGroup;
  exclusive?: string;
  text: ActionText;
  impact?: Impact;
  window?: HourRange;
  forWhom: Bilingual[];
}

/** Turns a spec into the action for the reader's language. */
export function makeAction(c: Ctx, o: ActionSpec): ActionOut {
  const lang = c.lang;
  return {
    id: o.id,
    group: o.group,
    exclusive: o.exclusive,
    counted: true, // settled by markCounted once all actions are ranked
    priority: priorityOf(o.id, c.prot),
    title: o.text.title[lang],
    why: o.text.why[lang],
    impact: o.impact ?? {},
    assumption: o.text.assumption ? o.text.assumption[lang] : "",
    window: o.window ? { start: o.window.start, end: o.window.end } : undefined,
    forWhom: o.forWhom.map((w) => w[lang]),
  };
}

/** What the indoor alternative is compared with. */
export interface IndoorComparison {
  bestAqi: number;
  outdoor: number;
  inside: number;
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
  indoors: (cmp: IndoorComparison, avoidedUg: number) => ActionSpec;
}

export function outdoorOrIndoors(c: Ctx, a: OutdoorActivity): ActionOut {
  if (a.best && a.best.aqi <= a.limit) {
    const avoided = Math.max(0, (a.usualPm25 - a.best.avgPm25) * a.vent * a.hours);
    return makeAction(c, a.window(a.best, avoided));
  }
  const outdoor = a.best ? a.best.avgPm25 : c.pm25;
  const inside = c.indoor(outdoor);
  const avoided = Math.max(0, (outdoor - inside) * a.vent * a.hours);
  return makeAction(c, a.indoors({ bestAqi: a.best ? a.best.aqi : c.aqi, outdoor, inside }, avoided));
}
