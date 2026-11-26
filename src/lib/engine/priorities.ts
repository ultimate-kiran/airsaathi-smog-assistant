/**
 * Every action the engine can propose, and how it ranks. One table, so the order of advice can be
 * tuned in one place. `urgent` actions also rise with today's AQI (Ctx.prot, 0-100), so on a bad
 * day protective steps overtake emission swaps; the others keep a fixed weight.
 */
export const PRIORITY = {
  "clean-cooking": { base: 86 },
  "stop-indoor-burning": { base: 82 },
  "wfh-severe": { base: 78 },
  "car-to-transit": { base: 50 },
  "air-out": { base: 50 },
  carpool: { base: 42 },
  "kitchen-exhaust": { base: 36 },
  "no-open-burning": { base: 30 },
  "sensitive-plan": { base: 32, urgent: true },
  "commute-mask": { base: 22, urgent: true },
  "kids-play-indoors": { base: 22, urgent: true },
  "elders-walk-indoors": { base: 20, urgent: true },
  "exercise-indoors": { base: 18, urgent: true },
  "kids-play-window": { base: 16, urgent: true },
  "bedroom-purifier": { base: 14, urgent: true },
  "elders-walk-window": { base: 12, urgent: true },
  "exercise-window": { base: 10, urgent: true },
  "smart-ventilation": { base: 8, urgent: true },
} as const satisfies Record<string, { base: number; urgent?: boolean }>;

export type ActionId = keyof typeof PRIORITY;

export function priorityOf(id: ActionId, prot: number): number {
  const p: { base: number; urgent?: boolean } = PRIORITY[id];
  return Math.round(Math.min(100, p.base + (p.urgent ? prot : 0)));
}
