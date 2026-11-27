import { z } from "zod";
import { AppError } from "@/lib/errors";
import { ok, rateLimitOrThrow, readJson, route } from "@/lib/http";
import { explainPlan, getPlan } from "@/lib/container";
import { ROUTE_LIMITS } from "@/lib/limits";
import { ProfileSchema } from "@/lib/types";

export const maxDuration = 30;

/**
 * The plan the page shows was built from one air reading (`fetchedAt`). The explanation must
 * describe that same reading, so if the server's reading has moved on, it says so (409) and the
 * page reloads the plan instead of showing text about numbers it is not displaying.
 */
const ExplainSchema = z.object({ profile: ProfileSchema, fetchedAt: z.string().min(1).max(40) });

/** AI-written headline, summary, tips and per-action notes for a plan. 503 when AI is off or failed. */
export const POST = route("explain", async (req) => {
  await rateLimitOrThrow(req, "explain");
  const { profile, fetchedAt } = await readJson(req, ExplainSchema, ROUTE_LIMITS.explain.maxBodyBytes);
  const plan = await getPlan(profile);
  if (plan.fetchedAt !== fetchedAt) throw new AppError("stale");
  const explanation = await explainPlan(plan, profile);
  if (!explanation) throw new AppError("ai_unavailable");
  return ok(explanation);
});
