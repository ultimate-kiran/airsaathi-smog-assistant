import { z } from "zod";

/** The two interface languages: English and Hindi. */
export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export type Bilingual = { en: string; hi: string };

const COMMUTE_MODES = ["car", "bike", "bus", "metro", "walk", "wfh"] as const;
const COOKING_FUELS = ["lpg", "png", "induction", "biomass"] as const;
const HEATING_TYPES = ["none", "electric", "biomass"] as const;
const WINDOW_HABITS = ["open", "mostly-closed"] as const;

export type CommuteMode = (typeof COMMUTE_MODES)[number];
export type CookingFuel = (typeof COOKING_FUELS)[number];
export type HeatingType = (typeof HEATING_TYPES)[number];
export type WindowHabit = (typeof WINDOW_HABITS)[number];

export const PROFILE_LIMITS = {
  adults: { min: 1, max: 12 },
  children: { min: 0, max: 12 },
  elders: { min: 0, max: 12 },
  commuteKm: { min: 0, max: 100 },
  exerciseMinutes: { min: 0, max: 180 },
} as const;

const boundedNumber = ({ min, max }: { min: number; max: number }) => z.number().min(min).max(max);

export const ProfileSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  place: z.string().trim().min(1).max(80),
  lang: z.enum(LANGS).default("en"),
  household: z.object({
    adults: boundedNumber(PROFILE_LIMITS.adults).int(),
    children: boundedNumber(PROFILE_LIMITS.children).int(),
    elders: boundedNumber(PROFILE_LIMITS.elders).int(),
    respiratory: z.boolean(),
    heart: z.boolean(),
    pregnant: z.boolean(),
  }),
  commute: z.object({
    mode: z.enum(COMMUTE_MODES),
    km: boundedNumber(PROFILE_LIMITS.commuteKm),
  }),
  cooking: z.enum(COOKING_FUELS),
  heating: z.enum(HEATING_TYPES),
  hasPurifier: z.boolean(),
  windows: z.enum(WINDOW_HABITS),
  exercise: z.object({
    outdoor: z.boolean(),
    minutes: boundedNumber(PROFILE_LIMITS.exerciseMinutes),
  }),
});
export type Profile = z.infer<typeof ProfileSchema>;

/*
 * API reply formats. Each is a zod schema and its TypeScript type is inferred from it, so the type
 * the server builds and the check the browser runs on every reply cannot drift apart.
 */

const CATEGORY_KEYS = ["good", "satisfactory", "moderate", "poor", "veryPoor", "severe"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const ACTION_GROUPS = ["health", "move", "outdoor", "indoor", "kitchen", "community"] as const;
export type ActionGroup = (typeof ACTION_GROUPS)[number];

const hour = z.number().int().min(0).max(23);

/** [start, end) in local hours; end may wrap past midnight. */
const HourRangeSchema = z.object({ start: hour, end: hour });
export type HourRange = z.infer<typeof HourRangeSchema>;

/** One hour of the forecast. Hours are numbers; the UI formats them in the reader's language. */
const HourPointSchema = z.object({
  hour,
  pm25: z.number(),
  pm10: z.number(),
  aqi: z.number(),
  category: z.enum(CATEGORY_KEYS),
  isNow: z.boolean(),
});
export type HourPoint = z.infer<typeof HourPointSchema>;

/** A ground-station reading, from OpenAQ (median of several) or WAQI (nearest one). Server only. */
export interface StationReading {
  name: string;
  km: number;
  updatedISO: string;
  pm25: number;
  pm10: number | null;
  /** how many stations back this number (default 1) */
  count?: number;
  /** true when the number rests on one station, low-cost sensors only, or stations that disagree */
  uncertain?: boolean;
}

const ImpactSchema = z.object({
  /** micrograms of PM2.5 you avoid inhaling, per day */
  inhaledPm25Ug: z.number().optional(),
  /** kg CO2e avoided, per day */
  co2eKg: z.number().optional(),
});
export type Impact = z.infer<typeof ImpactSchema>;

const ActionOutSchema = z.object({
  id: z.string(),
  group: z.enum(ACTION_GROUPS),
  /** actions sharing an exclusive key are alternatives; only the best counts toward totals */
  exclusive: z.string().optional(),
  /** true for the action that counts toward the totals (always true without an exclusive key) */
  counted: z.boolean(),
  priority: z.number(),
  title: z.string(),
  why: z.string(),
  impact: ImpactSchema,
  /** plain-language assumptions behind the numbers (empty when impact is qualitative) */
  assumption: z.string(),
  /** local hour range the action is tied to, formatted by the UI */
  window: HourRangeSchema.optional(),
  forWhom: z.array(z.string()),
  /** personalised sentence from the AI model, only ever restating numbers from this object */
  note: z.string().optional(),
});
export type ActionOut = z.infer<typeof ActionOutSchema>;

const AirSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("model") }),
  z.object({
    kind: z.literal("station"),
    name: z.string(),
    km: z.number(),
    updated: z.string(),
    count: z.number(),
    uncertain: z.boolean(),
  }),
]);
export type AirSource = z.infer<typeof AirSourceSchema>;

const PlanTextSchema = z.object({
  source: z.enum(["ai", "rules"]),
  headline: z.string(),
  summary: z.string(),
  familyTips: z.array(z.string()),
});
export type PlanText = z.infer<typeof PlanTextSchema>;

const PlanResponseSchema = z.object({
  place: z.string(),
  lang: z.enum(LANGS),
  fetchedAt: z.string(),
  source: AirSourceSchema,
  aqi: z.object({ value: z.number(), category: z.enum(CATEGORY_KEYS), pm25: z.number(), pm10: z.number() }),
  cigarettes: z.number(),
  hours: z.array(HourPointSchema).min(1),
  bestWindow: HourRangeSchema.extend({ aqi: z.number() }).nullable(),
  avoid: HourRangeSchema.extend({ allDay: z.boolean() }).nullable(),
  actions: z.array(ActionOutSchema),
  totals: z.object({ inhaledPm25Ug: z.number(), co2eKg: z.number(), cigaretteEq: z.number() }),
  ai: PlanTextSchema,
});
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

/** What /api/plan returns: the rule-based plan, plus whether /api/explain can add AI text. */
export const PlanViewSchema = PlanResponseSchema.extend({ aiEnabled: z.boolean() });
export type PlanView = z.infer<typeof PlanViewSchema>;

/** What /api/explain returns, merged into the plan by the client. */
export const AiExplanationSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  familyTips: z.array(z.string()),
  notes: z.record(z.string(), z.string()),
});
export type AiExplanation = z.infer<typeof AiExplanationSchema>;

export const QUESTION_LENGTH = { min: 2, max: 300 } as const;
export const PLACE_QUERY_LENGTH = { min: 2, max: 60 } as const;

export const AskReplySchema = z.object({ answer: z.string(), source: z.enum(["ai", "rules"]) });
export type AskReply = z.infer<typeof AskReplySchema>;

export const PlaceSchema = z.object({ name: z.string(), short: z.string(), lat: z.number(), lon: z.number() });
export type Place = z.infer<typeof PlaceSchema>;

/** Stable error codes the API returns; the client shows them in the reader's language. */
export const ERROR_CODES = [
  "rate_limited",
  "too_large",
  "bad_json",
  "invalid",
  "air_unavailable",
  "lookup_unavailable",
  "not_found",
  "outside_india",
  "ai_unavailable",
  "stale",
  "internal",
  "network",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
