import { z } from "zod";

export type Lang = "en" | "hi";
export type Bilingual = { en: string; hi: string };

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
    mode: z.enum(["car", "bike", "bus", "metro", "walk", "wfh"]),
    km: z.number().min(0).max(100),
  }),
  cooking: z.enum(["lpg", "png", "induction", "biomass"]),
  heating: z.enum(["none", "electric", "biomass"]),
  hasPurifier: z.boolean(),
  windows: z.enum(["open", "mostly-closed"]),
  exercise: z.object({
    outdoor: z.boolean(),
    minutes: z.number().min(0).max(180),
  }),
});
export type Profile = z.infer<typeof ProfileSchema>;

export type CategoryKey = "good" | "satisfactory" | "moderate" | "poor" | "veryPoor" | "severe";

export interface HourPoint {
  hour: number; // local hour 0-23
  label: string; // "2 pm"
  pm25: number;
  pm10: number;
  aqi: number;
  category: CategoryKey;
  isNow: boolean;
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
  priority: number;
  title: string;
  why: string;
  impact: Impact;
  /** plain-language assumptions behind the numbers (empty when impact is qualitative) */
  assumption: string;
  window?: string;
  forWhom: string[];
  /** personalised sentence from the AI model, only ever restating numbers from this object */
  note?: string;
}

export type AirSource =
  | { kind: "model" }
  | { kind: "station"; name: string; km: number; updated: string; count: number; uncertain: boolean };

export type PlanView = PlanResponse & { aiEnabled: boolean };

export interface PlanResponse {
  place: string;
  lang: Lang;
  fetchedAt: string;
  source: AirSource;
  aqi: { value: number; category: CategoryKey; pm25: number; pm10: number };
  cigarettes: number;
  hours: HourPoint[];
  bestWindow: { start: string; end: string; aqi: number } | null;
  avoid: { start: string; end: string; allDay: boolean } | null;
  actions: ActionOut[];
  totals: { inhaledPm25Ug: number; co2eKg: number; cigaretteEq: number };
  ai: { source: "ai" | "rules"; headline: string; summary: string; familyTips: string[] };
}
