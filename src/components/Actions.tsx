"use client";

import type { ReactNode } from "react";
import { showsCigarettes, toCigarettes } from "@/lib/aqi";
import { formatInt, formatRange, round1 } from "@/lib/format";
import { UI } from "@/lib/i18n";
import type { ActionGroup, ActionOut, Lang, PlanView } from "@/lib/types";
import Icon from "./Icon";

const ORDER: ActionGroup[] = ["health", "move", "outdoor", "indoor", "kitchen", "community"];
/** How many counted actions are featured under "Start here". */
const FEATURED_COUNT = 3;

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

const hasNumbers = (a: ActionOut) => !!a.impact.inhaledPm25Ug || !!a.impact.co2eKg;

function ActionMeta({ a, lang }: { a: ActionOut; lang: Lang }) {
  return (
    <div className="action__meta">
      <span className="tag">{UI[lang].groups[a.group]}</span>
      {a.window && (
        <span className="badge">
          <Icon name="clock" size={14} />
          {formatRange(a.window, lang)}
        </span>
      )}
    </div>
  );
}

function ImpactStats({ impact, lang }: { impact: ActionOut["impact"]; lang: Lang }) {
  const t = UI[lang];
  const { inhaledPm25Ug: ug, co2eKg: co2 } = impact;
  const cig = ug ? toCigarettes(ug) : 0;
  return (
    <p className="action__impact">
      {!!ug && (
        <span className="stat stat--pm">
          {emph(t.inhaled(Math.round(ug)))}
          {showsCigarettes(cig) && <small>{t.cigEq(cig)}</small>}
        </span>
      )}
      {!!co2 && <span className="stat stat--co2">{emph(t.co2(round1(co2)))}</span>}
    </p>
  );
}

function HowCalculated({ assumption, lang }: { assumption: string; lang: Lang }) {
  const t = UI[lang];
  if (!assumption) return <p className="action__calc muted">{t.noNumbers}</p>;
  return (
    <details className="action__calc">
      <summary>{t.howCalculated}</summary>
      <p>{assumption}</p>
    </details>
  );
}

interface ItemProps {
  a: ActionOut;
  lang: Lang;
  isDone: boolean;
  onToggle: (a: ActionOut) => void;
  featured?: boolean;
}

function ActionItem({ a, lang, isDone, onToggle, featured }: ItemProps) {
  const t = UI[lang];
  const measurable = hasNumbers(a);
  const className = ["action", `g-${a.group}`, isDone && "is-done", featured && "action--featured"]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className}>
      <ActionMeta a={a} lang={lang} />
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
      {measurable && <ImpactStats impact={a.impact} lang={lang} />}
      <HowCalculated assumption={a.assumption} lang={lang} />
      {!a.counted && <p className="muted">{t.pickOne}</p>}
      {measurable && (
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

function Totals({ totals, lang }: { totals: PlanView["totals"]; lang: Lang }) {
  const t = UI[lang];
  if (totals.inhaledPm25Ug + totals.co2eKg <= 0) return null;
  return (
    <section className="totals" aria-labelledby="totals-title">
      <div className="totals__copy">
        <h2 id="totals-title">{t.totalsTitle}</h2>
        <p>{t.totalsLead}</p>
      </div>
      <dl className="totals__grid">
        {totals.inhaledPm25Ug > 0 && (
          <div>
            <dt>PM2.5</dt>
            <dd>
              {formatInt(totals.inhaledPm25Ug)}
              <small> µg</small>
            </dd>
            <dd className="totals__note">
              {t.lessBreathed}
              {showsCigarettes(totals.cigaretteEq) && ` · ${t.cigEq(totals.cigaretteEq)}`}
            </dd>
          </div>
        )}
        {totals.co2eKg > 0 && (
          <div>
            <dt>CO₂</dt>
            <dd>
              {totals.co2eKg}
              <small> {t.units.kg}</small>
            </dd>
            <dd className="totals__note">{t.lessEmitted}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function FamilyTips({ tips, lang }: { tips: string[]; lang: Lang }) {
  if (tips.length === 0) return null;
  return (
    <section className="block tips-panel" aria-labelledby="tips-title">
      <h2 id="tips-title">{UI[lang].tipsTitle}</h2>
      <ul className="tips">
        {tips.map((tip, i) => (
          <li key={i}>
            <Icon name="leaf" size={18} />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Props {
  plan: PlanView;
  lang: Lang;
  doneIds: Set<string>;
  onToggle: (a: ActionOut) => void;
}

export default function Actions({ plan, lang, doneIds, onToggle }: Props) {
  const t = UI[lang];
  const top = plan.actions.filter((a) => a.counted).slice(0, FEATURED_COUNT);
  const topIds = new Set(top.map((a) => a.id));
  const rest = ORDER.flatMap((g) => plan.actions.filter((a) => a.group === g && !topIds.has(a.id)));
  const item = (a: ActionOut, featured = false) => (
    <ActionItem key={a.id} a={a} lang={lang} isDone={doneIds.has(a.id)} onToggle={onToggle} featured={featured} />
  );

  return (
    <>
      <section className="block" aria-labelledby="start-title">
        <h2 id="start-title">{t.startHere}</h2>
        <ol className="actions actions--top">{top.map((a) => item(a, true))}</ol>
      </section>

      <Totals totals={plan.totals} lang={lang} />

      {rest.length > 0 && (
        <section className="block" aria-labelledby="more-title">
          <h2 id="more-title">{t.more}</h2>
          <ul className="actions actions--more">{rest.map((a) => item(a))}</ul>
        </section>
      )}

      <FamilyTips tips={plan.ai.familyTips} lang={lang} />
    </>
  );
}
