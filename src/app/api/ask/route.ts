import { z } from "zod";
import { ok, rateLimitOrThrow, readJson, route } from "@/lib/http";
import { answerQuestion } from "@/lib/container";
import { ROUTE_LIMITS } from "@/lib/limits";
import { ProfileSchema, QUESTION_LENGTH } from "@/lib/types";

export const maxDuration = 30;

const AskSchema = z.object({
  question: z.string().trim().min(QUESTION_LENGTH.min).max(QUESTION_LENGTH.max),
  profile: ProfileSchema,
});

/** Answers a plain-language question about today's air for this household (AI, or rules as fallback). */
export const POST = route("ask", async (req) => {
  await rateLimitOrThrow(req, "ask");
  const { question, profile } = await readJson(req, AskSchema, ROUTE_LIMITS.ask.maxBodyBytes);
  const reply = await answerQuestion(question, profile);
  return ok(reply);
});
