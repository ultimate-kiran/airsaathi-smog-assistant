import type { AirSnapshot } from "./airdata";
import { ruleAnswer } from "./answers";
import { TtlCache, hashKey } from "./cache";
import { toGrid } from "./distance";
import { buildPlan } from "./engine";
import { AppError } from "./errors";
import { errorName, log } from "./log";
import type { AiExplanation, AskReply, PlanResponse, Profile } from "./types";

/**
 * The application service the API routes call (Facade). It owns caching so the routes stay thin:
 *  - air readings per ~1 km grid cell, so a language switch, a follow-up question and the AI
 *    explanation reuse one set of upstream calls instead of making up to seven each;
 *  - AI explanations and answers per exact AI input (failures are not cached).
 * Its collaborators are injected, so tests and other deployments can swap any of them;
 * container.ts wires the real ones.
 */
export interface PlanServiceDeps {
  fetchAir: (lat: number, lon: number) => Promise<AirSnapshot>;
  explain: (plan: PlanResponse, profile: Profile) => Promise<AiExplanation | null>;
  answer: (question: string, plan: PlanResponse, profile: Profile) => Promise<string | null>;
  /** Inputs that can change the injected model's reply. Defaults to the full plan and profile. */
  modelContext?: (plan: PlanResponse, profile: Profile) => unknown;
  ttlMs?: number;
  maxItems?: number;
}

export type PlanService = ReturnType<typeof createPlanService>;

export function createPlanService({
  fetchAir,
  explain,
  answer,
  modelContext = (plan, profile) => [plan, profile],
  ttlMs = 10 * 60_000,
  maxItems = 1000,
}: PlanServiceDeps) {
  const airCache = new TtlCache<AirSnapshot>(maxItems);
  const explainCache = new TtlCache<AiExplanation | null>(maxItems);
  const answerCache = new TtlCache<string | null>(maxItems);
  const found = <T>(v: T | null) => v !== null;

  function getAir(lat: number, lon: number): Promise<AirSnapshot> {
    const [glat, glon] = [toGrid(lat), toGrid(lon)];
    return airCache.getOrLoad(`${glat},${glon}`, ttlMs, () =>
      fetchAir(glat, glon).catch((e) => {
        log("warn", "air.unavailable", { reason: errorName(e) });
        throw new AppError("air_unavailable");
      }),
    );
  }

  /** The rule-based plan. Throws AppError("air_unavailable") when no air data is available. */
  async function getPlan(profile: Profile): Promise<PlanResponse> {
    return buildPlan(profile, await getAir(profile.lat, profile.lon));
  }

  function explainPlan(plan: PlanResponse, profile: Profile): Promise<AiExplanation | null> {
    const key = hashKey("explain", modelContext(plan, profile), profile.lang);
    return explainCache.getOrLoad(key, ttlMs, () => explain(plan, profile), found);
  }

  async function answerQuestion(question: string, profile: Profile): Promise<AskReply> {
    const plan = await getPlan(profile);
    const key = hashKey("answer", modelContext(plan, profile), profile.lang, question);
    const ai = await answerCache.getOrLoad(key, ttlMs, () => answer(question, plan, profile), found);
    return ai ? { answer: ai, source: "ai" } : { answer: ruleAnswer(question, plan, profile.lang), source: "rules" };
  }

  function reset(): void {
    airCache.clear();
    explainCache.clear();
    answerCache.clear();
  }

  return { getAir, getPlan, explainPlan, answerQuestion, reset };
}
