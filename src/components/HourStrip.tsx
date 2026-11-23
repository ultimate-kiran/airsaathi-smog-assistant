import { categoryByKey } from "@/lib/aqi";
import { UI } from "@/lib/i18n";
import type { Lang, PlanResponse } from "@/lib/types";

export default function HourStrip({ plan, lang }: { plan: PlanResponse; lang: Lang }) {
  const t = UI[lang];
  const { hours, bestWindow, avoid } = plan;
  const top = Math.max(200, ...hours.map((h) => h.aqi));

  const avoidSet = new Set<number>();
  if (avoid) {
    if (avoid.allDay) hours.forEach((_, i) => avoidSet.add(i));
    else {
      const start = hours.findIndex((h) => h.label === avoid.start);
      if (start >= 0) {
        for (let k = 0; k < hours.length; k++) {
          const i = (start + k) % hours.length;
          if (hours[i].label === avoid.end) break;
          avoidSet.add(i);
        }
      }
    }
  }
  const bestIdx = bestWindow ? hours.findIndex((h) => h.label === bestWindow.start) : -1;

  return (
    <section aria-labelledby="hours-title" className="block">
      <h2 id="hours-title">{t.hourlyTitle}</h2>
      <p className="muted">{t.hourlyHint}</p>

      <ul className="strip" aria-label={t.hourlyTitle}>
        {hours.map((h, i) => {
          const cat = categoryByKey(h.category);
          const height = Math.max(8, Math.round((h.aqi / top) * 100));
          const flags = [i === bestIdx ? t.cleanest : "", avoidSet.has(i) ? t.worst : ""].filter(Boolean).join(", ");
          return (
            <li
              key={`${h.hour}-${i}`}
              className={`strip__col${i === bestIdx ? " is-best" : ""}${avoidSet.has(i) ? " is-avoid" : ""}`}
            >
              <span className="sr-only">
                {h.label}: AQI {h.aqi}, {cat.label[lang]}
                {flags ? `, ${flags}` : ""}
              </span>
              <span className="strip__val" aria-hidden="true">
                {h.aqi}
              </span>
              <span
                className="strip__bar"
                style={{ height: `${height}%`, background: cat.color }}
                aria-hidden="true"
                title={`${h.label}: AQI ${h.aqi}`}
              />
              <span className="strip__tick" aria-hidden="true">
                {i % 3 === 0 ? h.label : ""}
              </span>
            </li>
          );
        })}
      </ul>

      <dl className="windows">
        {bestWindow && (
          <div>
            <dt>{t.cleanest}</dt>
            <dd>
              {bestWindow.start}–{bestWindow.end}
              <span className="muted"> · AQI ~{bestWindow.aqi}</span>
            </dd>
          </div>
        )}
        {avoid && (
          <div>
            <dt>{t.worst}</dt>
            <dd>{avoid.allDay ? t.allDay : `${avoid.start}–${avoid.end}`}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
