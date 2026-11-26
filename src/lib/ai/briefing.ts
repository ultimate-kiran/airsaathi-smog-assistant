import { z } from "zod";

export const Explanation = z.object({
  headline: z.string().min(1).max(160),
  summary: z.string().min(1).max(600),
  familyTips: z.array(z.string().max(240)).max(3),
  actionNotes: z.array(z.object({ id: z.string(), note: z.string().min(1).max(280) })).max(20),
});

/** The providers share the briefing shape. Length limits are enforced locally. */
export const BRIEFING_SCHEMA = z.toJSONSchema(Explanation, {
  target: "openapi-3.0",
  override({ jsonSchema }) {
    delete jsonSchema.minLength;
    delete jsonSchema.maxLength;
    delete jsonSchema.maxItems;
  },
});
