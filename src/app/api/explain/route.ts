import { AppError } from "@/lib/errors";
import { ok, rateLimitOrThrow, readJson, route } from "@/lib/http";
import { explainPlan, getPlan } from "@/lib/planService";
import { ProfileSchema } from "@/lib/types";

export const maxDuration = 30;

/** AI-written headline, summary, tips and per-action notes for a plan. 503 when AI is off or failed. */
export const POST = route("explain", async (req) => {
  await rateLimitOrThrow(req, "explain", 20);
  const profile = await readJson(req, ProfileSchema, 8_000);
  const plan = await getPlan(profile);
  const ai = await explainPlan(plan, profile);
  if (!ai) throw new AppError("ai_unavailable");
  return ok(ai);
});
