import type { Lang } from "../types";
import { common, type CommonStrings } from "./common";
import { place, type PlaceStrings } from "./place";
import { form, type FormStrings } from "./form";
import { plan, type PlanStrings } from "./plan";
import { tools, type ToolsStrings } from "./tools";

/**
 * All interface text in English and Hindi, one file per area of the page. Components read one
 * merged object (`UI[lang].key`), so where a string lives never changes how it is used.
 */
export type Strings = CommonStrings & PlaceStrings & FormStrings & PlanStrings & ToolsStrings;

const merge = (lang: Lang): Strings => ({ ...common[lang], ...place[lang], ...form[lang], ...plan[lang], ...tools[lang] });

export const UI: Record<Lang, Strings> = { en: merge("en"), hi: merge("hi") };

export const SAMPLE_PLACES = [
  { name: "Delhi, India", short: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Lucknow, Uttar Pradesh, India", short: "Lucknow", lat: 26.8467, lon: 80.9462 },
  { name: "Kolkata, West Bengal, India", short: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Mumbai, Maharashtra, India", short: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Bengaluru, Karnataka, India", short: "Bengaluru", lat: 12.9716, lon: 77.5946 },
];
