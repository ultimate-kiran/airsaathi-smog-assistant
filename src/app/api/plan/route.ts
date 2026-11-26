import { aiEnabled } from "@/lib/ai";
import { ok, rateLimitOrThrow, readJson, route } from "@/lib/http";
import { getPlan } from "@/lib/planService";
import { ProfileSchema } from "@/lib/types";

export const maxDuration = 30;

/** The rule-based plan, returned as soon as the air data is in. AI text comes from /api/explain. */
export const POST = route("plan", async (req) => {
  await rateLimitOrThrow(req, "plan", 20);
  const profile = await readJson(req, ProfileSchema, 8_000);
  const plan = await getPlan(profile);
  return ok({ ...plan, aiEnabled: aiEnabled() });
});
