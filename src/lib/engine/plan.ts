import type { AirSnapshot } from "../airdata";
import { categoryFor, cigarettesForDay, toCigarettes } from "../aqi";
import { formatRange, round1 } from "../format";
import type { ActionOut, Lang, PlanResponse, PlanText, Profile } from "../types";
import { buildContext, type Ctx } from "./context";
import type { Rule } from "./rule";
import { RULES } from "./rules";
import { worstStretch } from "./windows";

/** Runs the rules and ranks what they propose, most urgent first. */
export function planActions(c: Ctx, rules: readonly Rule[] = RULES): ActionOut[] {
  const all = rules.map((rule) => rule(c)).filter((a): a is ActionOut => a !== null);
  return markCounted(all.sort((a, b) => b.priority - a.priority));
}

/** Within each exclusive group only the highest-priority action counts toward the totals. */
export function markCounted(ranked: ActionOut[]): ActionOut[] {
  const seen = new Set<string>();
  return ranked.map((a) => {
    if (!a.exclusive) return { ...a, counted: true };
    const first = !seen.has(a.exclusive);
    seen.add(a.exclusive);
    return { ...a, counted: first };
  });
}

export function totalsFor(actions: ActionOut[]): PlanResponse["totals"] {
  let inhaled = 0;
  let co2 = 0;
  for (const a of markCounted(actions)) {
    if (!a.counted) continue;
    inhaled += a.impact.inhaledPm25Ug ?? 0;
    co2 += a.impact.co2eKg ?? 0;
  }
  return { inhaledPm25Ug: Math.round(inhaled), co2eKg: round1(co2), cigaretteEq: toCigarettes(inhaled) };
}

/** The headline and summary shown when AI is off or its answer was rejected. */
export function ruleSummary(
  place: string,
  lang: Lang,
  aqi: number,
  best: PlanResponse["bestWindow"],
  top?: ActionOut,
): PlanText {
  const cat = categoryFor(aqi).label;
  const headline =
    lang === "hi"
      ? `${place} में हवा ${cat.hi} है (AQI ${aqi})। आज की आपकी योजना।`
      : `Air in ${place} is ${cat.en.toLowerCase()} (AQI ${aqi}). Here is your plan for today.`;
  const parts: string[] = [];
  if (best) {
    const w = formatRange(best, lang);
    parts.push(lang === "hi" ? `सबसे साफ़ समय ${w} (AQI लगभग ${best.aqi})।` : `Cleanest hours: ${w} (AQI about ${best.aqi}).`);
  }
  if (top) parts.push(lang === "hi" ? `सबसे पहले: ${top.title}।` : `Start with: ${top.title}.`);
  return { source: "rules", headline, summary: parts.join(" "), familyTips: [] };
}

/** Pure and deterministic: same inputs, same plan. AI text is added later, by /api/explain. */
export function buildPlan(p: Profile, air: AirSnapshot): PlanResponse {
  const c = buildContext(p, air);
  const actions = planActions(c);
  const best = c.bestHour ? { start: c.bestHour.start, end: c.bestHour.end, aqi: c.bestHour.aqi } : null;
  const cur = air.current;
  return {
    place: p.place,
    lang: p.lang,
    fetchedAt: air.fetchedAt,
    source: air.source,
    aqi: { value: cur.aqi, category: cur.category, pm25: cur.pm25, pm10: cur.pm10 },
    cigarettes: cigarettesForDay(c.avg.day),
    hours: air.hours,
    bestWindow: best,
    avoid: worstStretch(air.hours, c.limits.vulnerable),
    actions,
    totals: totalsFor(actions),
    ai: ruleSummary(p.place, p.lang, cur.aqi, best, actions[0]),
  };
}
