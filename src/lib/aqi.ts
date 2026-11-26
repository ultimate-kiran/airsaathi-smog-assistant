import { round1 } from "./format";
import type { Bilingual, CategoryKey } from "./types";

/**
 * India National AQI (CPCB) sub-index breakpoints, contiguous form.
 * [concLow, concHigh, indexLow, indexHigh]
 * PM2.5 and PM10 in µg/m³ (CPCB defines these on 24-hour averages; applying them to
 * hourly values gives an indicative reading, which the UI says).
 */
const PM25_BP: [number, number, number, number][] = [
  [0, 30, 0, 50],
  [30, 60, 50, 100],
  [60, 90, 100, 200],
  [90, 120, 200, 300],
  [120, 250, 300, 400],
  [250, 500, 400, 500],
];
const PM10_BP: [number, number, number, number][] = [
  [0, 50, 0, 50],
  [50, 100, 50, 100],
  [100, 250, 100, 200],
  [250, 350, 200, 300],
  [350, 430, 300, 400],
  [430, 600, 400, 500],
];

function subIndex(conc: number, bp: [number, number, number, number][]): number {
  const c = Math.max(0, conc);
  for (const [cl, ch, il, ih] of bp) {
    if (c <= ch) return il + ((ih - il) / (ch - cl)) * (c - cl);
  }
  return 500;
}

export function indiaAqi(pm25: number, pm10: number): number {
  return Math.round(Math.max(subIndex(pm25, PM25_BP), subIndex(pm10, PM10_BP)));
}

export interface Category {
  key: CategoryKey;
  label: Bilingual;
  max: number;
  color: string;
  ink: string;
}

export const CATEGORIES: Category[] = [
  {
    key: "good",
    label: { en: "Good", hi: "अच्छा" },
    max: 50,
    color: "#1c7d52",
    ink: "#ffffff",
  },
  {
    key: "satisfactory",
    label: { en: "Satisfactory", hi: "संतोषजनक" },
    max: 100,
    color: "#76a82f",
    ink: "#10200a",
  },
  {
    key: "moderate",
    label: { en: "Moderate", hi: "मध्यम" },
    max: 200,
    color: "#e0b000",
    ink: "#2b2200",
  },
  {
    key: "poor",
    label: { en: "Poor", hi: "खराब" },
    max: 300,
    color: "#e0720b",
    ink: "#1d0d00",
  },
  {
    key: "veryPoor",
    label: { en: "Very poor", hi: "बहुत खराब" },
    max: 400,
    color: "#d03a2d",
    ink: "#ffffff",
  },
  {
    key: "severe",
    label: { en: "Severe", hi: "गंभीर" },
    max: 500,
    color: "#8b1a3a",
    ink: "#ffffff",
  },
];

export function categoryFor(aqi: number): Category {
  return CATEGORIES.find((c) => aqi <= c.max) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function categoryByKey(key: CategoryKey): Category {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];
}

/** Berkeley Earth rule of thumb: 22 µg/m³ of PM2.5 over 24 h is roughly one cigarette a day. */
export const UG_PER_CIGARETTE_DAY = 22;
/** Dose behind that rule: 22 µg/m³ × ~15 m³ of air breathed per day. */
export const INHALED_UG_PER_CIGARETTE = 330;

/** Avoided (or inhaled) PM2.5 dose expressed as cigarettes. */
export const toCigarettes = (inhaledUg: number) => round1(inhaledUg / INHALED_UG_PER_CIGARETTE);

/** A day spent breathing this 24-hour average concentration, as cigarettes. */
export const cigarettesForDay = (avgPm25: number) => round1(avgPm25 / UG_PER_CIGARETTE_DAY);
