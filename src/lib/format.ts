import type { HourRange, Lang } from "./types";

/** Shared number and time formatting, used by the engine, the AI context and the UI alike. */

export const round1 = (n: number) => Math.round(n * 10) / 10;

const h12 = (h: number) => (h % 12 === 0 ? 12 : h % 12);

/** Hindi speakers name the part of the day rather than am/pm. */
function hiPeriod(h: number): string {
  if (h >= 4 && h < 12) return "सुबह";
  if (h >= 12 && h < 16) return "दोपहर";
  if (h >= 16 && h < 20) return "शाम";
  return "रात";
}

/** "3 pm" or "दोपहर 3 बजे". */
export function formatHour(hour: number, lang: Lang): string {
  const h = ((hour % 24) + 24) % 24;
  return lang === "hi" ? `${hiPeriod(h)} ${h12(h)} बजे` : `${h12(h)} ${h < 12 ? "am" : "pm"}`;
}

/** Compact label for chart ticks: "3 pm" or "दोपहर 3". */
export function formatHourShort(hour: number, lang: Lang): string {
  const h = ((hour % 24) + 24) % 24;
  return lang === "hi" ? `${hiPeriod(h)} ${h12(h)}` : formatHour(h, "en");
}

/** "2 pm–3 pm", or in Hindi "दोपहर 2–3 बजे" when both ends share a part of the day. */
export function formatRange({ start, end }: HourRange, lang: Lang): string {
  if (lang === "hi") {
    const s = ((start % 24) + 24) % 24;
    const e = ((end % 24) + 24) % 24;
    return hiPeriod(s) === hiPeriod(e)
      ? `${hiPeriod(s)} ${h12(s)}–${h12(e)} बजे`
      : `${formatHour(s, "hi")} से ${formatHour(e, "hi")} तक`;
  }
  return `${formatHour(start, "en")}–${formatHour(end, "en")}`;
}

/** Indian digit grouping (1,23,456) for both languages. */
export const formatInt = (n: number) => Math.round(n).toLocaleString("en-IN");
