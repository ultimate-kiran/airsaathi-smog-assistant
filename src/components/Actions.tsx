"use client";

import type { ReactNode } from "react";
import { toCigarettes } from "@/lib/aqi";
import { formatInt, formatRange, round1 } from "@/lib/format";
import { UI } from "@/lib/i18n";
import type { ActionGroup, ActionOut, Lang, PlanView } from "@/lib/types";
import Icon from "./Icon";

const ORDER: ActionGroup[] = ["health", "move", "outdoor", "indoor", "kitchen", "community"];

/** Bolds the first number in a sentence so impact figures are easy to scan, in either language. */
function emph(text: string): ReactNode {
  const m = /^(.*?)([\d][\d,.]*)(.*)$/s.exec(text);
  if (!m) return text;
  return (
    <>
      {m[1]}
      <strong>{m[2]}</strong>
      {m[3]}
    </>
  );
}

function ActionItem({
  a,
  lang,
  isDone,
  onToggle,
  featured,
}: {
  a: ActionOut;
  lang: Lang;
  isDone: boolean;
  onToggle: (a: ActionOut) => void;
  featured?: boolean;
}) {
  const t = UI[lang];
  const ug = a.impact.inhaledPm25Ug;
  const co2 = a.impact.co2eKg;
  const cig = ug ? toCigarettes(ug) : 0;
  const hasNumbers = !!ug || !!co2;

  return (
    <li className={`action g-${a.group}${isDone ? " is-done" : ""}${featured ? " action--featured" : ""}`}>
      <div className="action__meta">
        <span className="tag">{t.groups[a.group]}</span>
        {a.window && (
          <span className="badge">
            <Icon name="clock" size={14} />
            {formatRange(a.window, lang)}
          </span>
        )}
      </div>
      <h3>{a.title}</h3>
      <p className="action__for">
        {t.forLabel}: {a.forWhom.join(", ")}
      </p>
      <p className="action__why">{a.why}</p>
      {a.note && (
        <p className="action__note">
          <Icon name="sparkle" size={16} />
          <span>
            <strong>{t.forHousehold}.</strong> {a.note}
          </span>
        </p>
      )}

      {hasNumbers && (
        <p className="action__impact">
          {ug ? (
            <span className="stat stat--pm">
              {emph(t.inhaled(Math.round(ug)))}
              {cig >= 0.1 && <small>{t.cigEq(cig)}</small>}
            </span>
          ) : null}
          {co2 ? <span className="stat stat--co2">{emph(t.co2(round1(co2)))}</span> : null}
        </p>
      )}

      {a.assumption ? (
        <details className="action__calc">
          <summary>{t.howCalculated}</summary>
          <p>{a.assumption}</p>
        </details>
      ) : (
        <p className="action__calc muted">{t.noNumbers}</p>
      )}

      {!a.counted && <p className="muted">{t.pickOne}</p>}

      {hasNumbers && (
        <label className="done">
          <input type="checkbox" checked={isDone} onChange={() => onToggle(a)} />
          <span>
            <Icon name="check" size={16} />
            {t.didThis}
          </span>
        </label>
      )}
    </li>
  );
}

export default function Actions({
  plan,
  lang,
  doneIds,
  onToggle,
}: {
  plan: PlanView;
  lang: Lang;
  doneIds: Set<string>;
  onToggle: (a: ActionOut) => void;
}) {
  const t = UI[lang];
  const top = plan.actions.filter((a) => a.counted).slice(0, 3);
  const topIds = new Set(top.map((a) => a.id));
  const rest = plan.actions.filter((a) => !topIds.has(a.id));

  return (
    <>
      <section className="block" aria-labelledby="start-title">
        <h2 id="start-title">{t.startHere}</h2>
        <ol className="actions actions--top">
          {top.map((a) => (
            <ActionItem key={a.id} a={a} lang={lang} isDone={doneIds.has(a.id)} onToggle={onToggle} featured />
          ))}
        </ol>
      </section>

      {plan.totals.inhaledPm25Ug + plan.totals.co2eKg > 0 && (
        <section className="totals" aria-labelledby="totals-title">
          <div className="totals__copy">
            <h2 id="totals-title">{t.totalsTitle}</h2>
            <p>{t.totalsLead}</p>
          </div>
          <dl className="totals__grid">
            {plan.totals.inhaledPm25Ug > 0 && (
              <div>
                <dt>PM2.5</dt>
                <dd>
                  {formatInt(plan.totals.inhaledPm25Ug)}
                  <small> µg</small>
                </dd>
                <dd className="totals__note">
                  {t.lessBreathed}
                  {plan.totals.cigaretteEq >= 0.1 && ` · ${t.cigEq(plan.totals.cigaretteEq)}`}
                </dd>
              </div>
            )}
            {plan.totals.co2eKg > 0 && (
              <div>
                <dt>CO₂</dt>
                <dd>
                  {plan.totals.co2eKg}
                  <small> {t.units.kg}</small>
                </dd>
                <dd className="totals__note">{t.lessEmitted}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {rest.length > 0 && (
        <section className="block" aria-labelledby="more-title">
          <h2 id="more-title">{t.more}</h2>
          <ul className="actions actions--more">
            {ORDER.flatMap((g) => rest.filter((a) => a.group === g)).map((a) => (
              <ActionItem
                key={a.id}
                a={a}
                lang={lang}
                isDone={doneIds.has(a.id)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      )}

      {plan.ai.familyTips.length > 0 && (
        <section className="block tips-panel" aria-labelledby="tips-title">
          <h2 id="tips-title">{t.tipsTitle}</h2>
          <ul className="tips">
            {plan.ai.familyTips.map((tip, i) => (
              <li key={i}>
                <Icon name="leaf" size={18} />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
