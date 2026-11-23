import { INHALED_UG_PER_CIGARETTE } from "@/lib/aqi";
import { UI } from "@/lib/i18n";
import { lastNDays, localDate, streak, type DoneLog } from "@/lib/storage";
import type { Lang } from "@/lib/types";

const sum = (log: DoneLog, day: string, k: "ug" | "co2") => (log[day] ?? []).reduce((s, e) => s + e[k], 0);

export default function Tracker({ log, lang }: { log: DoneLog; lang: Lang }) {
  const t = UI[lang];
  const today = localDate();
  const days = lastNDays(7);
  const ugToday = sum(log, today, "ug");
  const co2Today = sum(log, today, "co2");
  const series = days.map((d) => sum(log, d, "ug"));
  const top = Math.max(1, ...series);
  const any = Object.values(log).some((e) => e.length > 0);
  const cig = Math.round((ugToday / INHALED_UG_PER_CIGARETTE) * 10) / 10;

  return (
    <section className="block tracker" aria-labelledby="tracker-title">
      <h2 id="tracker-title">{t.trackerTitle}</h2>
      {!any ? (
        <p className="muted">{t.trackerEmpty}</p>
      ) : (
        <>
          <dl className="tracker__today">
            <div>
              <dt>{t.today}</dt>
              <dd>
                {Math.round(ugToday).toLocaleString("en-IN")}
                <small> µg PM2.5</small>
              </dd>
              {cig >= 0.1 && <p className="muted">{t.cigEq(cig)}</p>}
            </div>
            <div>
              <dt>CO₂</dt>
              <dd>
                {Math.round(co2Today * 10) / 10}
                <small> kg</small>
              </dd>
            </div>
            <div>
              <dt>{t.streak(streak(log))}</dt>
            </div>
          </dl>
          <p className="muted">{t.last7}</p>
          <ul className="spark" aria-label={t.last7}>
            {days.map((d, i) => (
              <li key={d}>
                <span className="sr-only">
                  {d}: {Math.round(series[i])} µg
                </span>
                <span
                  className={`spark__bar${d === today ? " is-today" : ""}`}
                  style={{ height: `${Math.max(4, (series[i] / top) * 100)}%` }}
                  aria-hidden="true"
                />
                <span className="spark__day" aria-hidden="true">
                  {d.slice(8)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
