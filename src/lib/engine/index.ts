/**
 * The rules engine. Every number the user sees comes from here, not from the language model.
 *   constants.ts  named assumptions          windows.ts  cleanest and worst hours
 *   context.ts    per-plan facts             rule.ts     the Rule type and shared helpers
 *   rules/        one file per topic         plan.ts     ranking, totals and the plan itself
 */
export { AQI, HOURS, K, TIME, TRIP } from "./constants";
export { buildContext, type Ctx } from "./context";
export { buildPlan, markCounted, planActions, ruleSummary, totalsFor } from "./plan";
export type { Rule } from "./rule";
export { RULES } from "./rules";
export { bestWindow, worstStretch, type Window } from "./windows";
