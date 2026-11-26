import { answerWithAi, contextFor, explainWithAi } from "./ai";
import type { AirSnapshot } from "./airdata";
import { fetchBestAir } from "./airsource";
import { ruleAnswer } from "./answers";
import { TtlCache, hashKey } from "./cache";
import { toGrid } from "./distance";
import { buildPlan } from "./engine";
import { AppError } from "./errors";
import { errorName, log } from "./log";
import type { AiExplanation, PlanResponse, Profile } from "./types";

/**
 * The application service the API routes call (Facade). It owns caching so the routes stay thin:
 *  - air readings per ~1 km grid cell for 10 minutes, so a language switch, a follow-up question
 *    and the AI explanation reuse one set of upstream calls instead of making up to seven each;
 *  - AI explanations and answers per exact AI input for 10 minutes (failures are not cached).
 * Caches are per server instance; see README for the shared-store option.
 */
const TEN_MINUTES = 10 * 60_000;

const airCache = new TtlCache<AirSnapshot>(1000);
const explainCache = new TtlCache<AiExplanation | null>(1000);
const answerCache = new TtlCache<string | null>(1000);

export function getAir(lat: number, lon: number): Promise<AirSnapshot> {
  const key = `${toGrid(lat)},${toGrid(lon)}`;
  return airCache.getOrLoad(key, TEN_MINUTES, () =>
    fetchBestAir(toGrid(lat), toGrid(lon)).catch((e) => {
      log("warn", "air.unavailable", { reason: errorName(e) });
      throw new AppError("air_unavailable");
    }),
  );
}

/** The rule-based plan. Throws AppError("air_unavailable") when no air data is available. */
export async function getPlan(profile: Profile): Promise<PlanResponse> {
  return buildPlan(profile, await getAir(profile.lat, profile.lon));
}

export async function explainPlan(plan: PlanResponse, profile: Profile): Promise<AiExplanation | null> {
  const key = hashKey("explain", contextFor(plan, profile), profile.lang);
  return explainCache.getOrLoad(key, TEN_MINUTES, () => explainWithAi(plan, profile), (v) => v !== null);
}

export async function answerQuestion(
  question: string,
  profile: Profile,
): Promise<{ answer: string; source: "ai" | "rules" }> {
  const plan = await getPlan(profile);
  const key = hashKey("answer", contextFor(plan, profile), profile.lang, question.toLowerCase());
  const ai = await answerCache.getOrLoad(key, TEN_MINUTES, () => answerWithAi(question, plan, profile), (v) => v !== null);
  return ai ? { answer: ai, source: "ai" } : { answer: ruleAnswer(question, plan, profile.lang), source: "rules" };
}

/** For tests: start every case with empty caches. */
export function resetCaches(): void {
  airCache.clear();
  explainCache.clear();
  answerCache.clear();
}
