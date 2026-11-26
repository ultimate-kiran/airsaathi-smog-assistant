import { answerWithAi, contextFor, explainWithAi } from "./ai";
import { fetchBestAir } from "./airsource";
import { createPlaceService } from "./places";
import { createPlanService } from "./planService";
import { sharedLimiter } from "./ratelimit";

/**
 * Composition root: the one place that builds the services with their real collaborators.
 * Routes use these instances; tests can build their own with fakes, or reset these.
 */
export const plans = createPlanService({
  fetchAir: fetchBestAir,
  explain: explainWithAi,
  answer: answerWithAi,
  modelContext: contextFor,
});
export const places = createPlaceService({ shared: sharedLimiter });

export const { getPlan, explainPlan, answerQuestion } = plans;

/** For tests: start a case with empty caches. */
export function resetAll(): void {
  plans.reset();
  places.reset();
}
