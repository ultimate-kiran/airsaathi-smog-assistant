import { categoryByKey } from "./aqi";
import { formatRange } from "./format";
import { UI } from "./i18n";
import type { Lang, PlanResponse } from "./types";

/** Plain-text summary of the plan for WhatsApp or the clipboard. */
export function shareText(plan: PlanResponse, lang: Lang, maxActions = 4): string {
  const t = UI[lang];
  const cat = categoryByKey(plan.aqi.category).label[lang];
  const lines = [`AirSaathi · ${plan.place}`, `AQI ${plan.aqi.value} (${cat})`];
  if (plan.bestWindow) lines.push(`${t.cleanest}: ${formatRange(plan.bestWindow, lang)} (AQI ~${plan.bestWindow.aqi})`);
  lines.push("");
  for (const a of plan.actions.slice(0, maxActions)) {
    lines.push(`• ${a.title}${a.window ? ` (${formatRange(a.window, lang)})` : ""}`);
  }
  return lines.join("\n");
}
