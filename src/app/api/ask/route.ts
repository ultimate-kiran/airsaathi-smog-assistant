import { z } from "zod";
import { ok, rateLimitOrThrow, readJson, route } from "@/lib/http";
import { answerQuestion } from "@/lib/container";
import { ProfileSchema, QUESTION_LENGTH } from "@/lib/types";

export const maxDuration = 30;

const AskSchema = z.object({
  question: z.string().trim().min(QUESTION_LENGTH.min).max(QUESTION_LENGTH.max),
  profile: ProfileSchema,
});

export const POST = route("ask", async (req) => {
  await rateLimitOrThrow(req, "ask", 10);
  const { question, profile } = await readJson(req, AskSchema, 10_000);
  const reply = await answerQuestion(question, profile);
  return ok(reply);
});
