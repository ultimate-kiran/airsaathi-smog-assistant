import { z } from "zod";

/**
 * The one place that reads server configuration. Every value is validated; an invalid value is
 * treated as missing (the feature it enables turns off) rather than crashing the app.
 * Read on each call so tests and serverless cold starts always see the current environment.
 */

const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const opt = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional()).catch(undefined);

const modelName = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9.\-_]{2,60}$/);
/** A model name that is set but unsafe turns its provider off instead of silently using the default. */
export const INVALID_MODEL = "invalid";
const model = z.preprocess(blankToUndefined, modelName.optional()).catch(INVALID_MODEL);

const EnvSchema = z.object({
  OPENAI_API_KEY: opt(z.string().trim().min(1)),
  OPENAI_MODEL: model,
  GEMINI_API_KEY: opt(z.string().trim().min(1)),
  GEMINI_MODEL: model,
  AI_PROVIDER: opt(
    z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.enum(["openai", "gemini"])),
  ),
  OPENAQ_API_KEY: opt(z.string().regex(/^[A-Za-z0-9]{20,100}$/)),
  WAQI_TOKEN: opt(z.string().regex(/^[A-Za-z0-9]{20,60}$/)),
  UPSTASH_REDIS_REST_URL: opt(z.url({ protocol: /^https$/ })),
  UPSTASH_REDIS_REST_TOKEN: opt(z.string().min(10)),
});

export type Env = z.infer<typeof EnvSchema>;

export function env(): Env {
  return EnvSchema.parse(process.env);
}
