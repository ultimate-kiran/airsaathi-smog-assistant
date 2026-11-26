import type { AiExplanation, PlanResponse } from "./types";

/**
 * Pure: the plan with AI text and per-action notes applied. Never mutates its inputs.
 * Shared by the server and the browser (the plan arrives first, the AI text a moment later).
 */
export function withAi<P extends PlanResponse>(plan: P, ai: AiExplanation | null): P {
  if (!ai) return plan;
  return {
    ...plan,
    ai: { source: "ai", headline: ai.headline, summary: ai.summary, familyTips: ai.familyTips },
    actions: plan.actions.map((a) => (ai.notes[a.id] ? { ...a, note: ai.notes[a.id] } : a)),
  };
}
