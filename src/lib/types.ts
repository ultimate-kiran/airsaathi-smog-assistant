import { z } from "zod";

export type Lang = "en" | "hi";
export type Bilingual = { en: string; hi: string };

export const COMMUTE_MODES = ["car", "bike", "bus", "metro", "walk", "wfh"] as const;
export const COOKING_FUELS = ["lpg", "png", "induction", "biomass"] as const;
export const HEATING_TYPES = ["none", "electric", "biomass"] as const;
export const WINDOW_HABITS = ["open", "mostly-closed"] as const;

export type CommuteMode = (typeof COMMUTE_MODES)[number];
export type CookingFuel = (typeof COOKING_FUELS)[number];
export type HeatingType = (typeof HEATING_TYPES)[number];
export type WindowHabit = (typeof WINDOW_HABITS)[number];

export const ProfileSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  place: z.string().trim().min(1).max(80),
  lang: z.enum(["en", "hi"]).default("en"),
  household: z.object({
    adults: z.number().int().min(1).max(12),
    children: z.number().int().min(0).max(12),
    elders: z.number().int().min(0).max(12),
    respiratory: z.boolean(),
    heart: z.boolean(),
    pregnant: z.boolean(),
  }),
  commute: z.object({
    mode: z.enum(COMMUTE_MODES),
    km: z.number().min(0).max(100),
  }),
  cooking: z.enum(COOKING_FUELS),
  heating: z.enum(HEATING_TYPES),
  hasPurifier: z.boolean(),
  windows: z.enum(WINDOW_HABITS),
  exercise: z.object({
    outdoor: z.boolean(),
    minutes: z.number().min(0).max(180),
  }),
});
export type Profile = z.infer<typeof ProfileSchema>;

export type CategoryKey = "good" | "satisfactory" | "moderate" | "poor" | "veryPoor" | "severe";

/** One hour of the forecast. Hours are numbers; the UI formats them in the reader's language. */
export interface HourPoint {
  hour: number; // local hour 0-23
  pm25: number;
  pm10: number;
  aqi: number;
  category: CategoryKey;
  isNow: boolean;
}

/** A ground-station reading, from OpenAQ (median of several) or WAQI (nearest one). */
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

export type ActionGroup = "health" | "move" | "outdoor" | "indoor" | "kitchen" | "community";

export interface Impact {
  /** micrograms of PM2.5 you avoid inhaling, per day */
  inhaledPm25Ug?: number;
  /** kg CO2e avoided, per day */
  co2eKg?: number;
}

export interface ActionOut {
  id: string;
  group: ActionGroup;
  /** actions sharing an exclusive key are alternatives; only the best counts toward totals */
  exclusive?: string;
  /** true for the action that counts toward the totals (always true when there is no exclusive key) */
  counted: boolean;
  priority: number;
  title: string;
  why: string;
  impact: Impact;
  /** plain-language assumptions behind the numbers (empty when impact is qualitative) */
  assumption: string;
  /** local hour range the action is tied to, formatted by the UI */
  window?: HourRange;
  forWhom: string[];
  /** personalised sentence from the AI model, only ever restating numbers from this object */
  note?: string;
}

/** [start, end) in local hours; end may wrap past midnight. */
export interface HourRange {
  start: number;
  end: number;
}

export type AirSource =
  | { kind: "model" }
  | { kind: "station"; name: string; km: number; updated: string; count: number; uncertain: boolean };

export interface PlanText {
  source: "ai" | "rules";
  headline: string;
  summary: string;
  familyTips: string[];
}

export interface PlanResponse {
  place: string;
  lang: Lang;
  fetchedAt: string;
  source: AirSource;
  aqi: { value: number; category: CategoryKey; pm25: number; pm10: number };
  cigarettes: number;
  hours: HourPoint[];
  bestWindow: (HourRange & { aqi: number }) | null;
  avoid: (HourRange & { allDay: boolean }) | null;
  actions: ActionOut[];
  totals: { inhaledPm25Ug: number; co2eKg: number; cigaretteEq: number };
  ai: PlanText;
}

/** What /api/plan returns: the rule-based plan, plus whether /api/explain can add AI text. */
export type PlanView = PlanResponse & { aiEnabled: boolean };

/** What /api/explain returns, merged into the plan by the client. */
export interface AiExplanation {
  headline: string;
  summary: string;
  familyTips: string[];
  notes: Record<string, string>;
}

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
  "network",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
