"use client";

import type { ReactNode } from "react";
import { showsCigarettes, toCigarettes } from "@/lib/aqi";
import { formatInt, formatRange, round1 } from "@/lib/format";
import { UI } from "@/lib/i18n";
import { ACTION_GROUPS, type ActionOut, type Lang, type PlanView } from "@/lib/types";
import Icon from "./Icon";

/** How many counted actions are featured under "Start here". */
const FEATURED_COUNT = 3;

/** Bolds the first number in a sentence so impact figures are easy to scan, in either language. */
function boldFirstNumber(text: string): ReactNode {
  const match = /^(.*?)([\d][\d,.]*)(.*)$/s.exec(text);
  if (!match) return text;
  const [, before, number, after] = match;
  return (
    <>
      {before}
      <strong>{number}</strong>
      {after}
    </>
  );
}

const hasNumbers = (action: ActionOut) => !!action.impact.inhaledPm25Ug || !!action.impact.co2eKg;

function ActionMeta({ action, lang }: { action: ActionOut; lang: Lang }) {
  return (
    <div className="action__meta">
      <span className="tag">{UI[lang].groups[action.group]}</span>
      {action.window && (
        <span className="badge">
          <Icon name="clock" size={14} />
          {formatRange(action.window, lang)}
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
          {boldFirstNumber(t.inhaled(Math.round(ug)))}
          {showsCigarettes(cig) && <small>{t.cigEq(cig)}</small>}
        </span>
      )}
      {!!co2 && <span className="stat stat--co2">{boldFirstNumber(t.co2(round1(co2)))}</span>}
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
  action: ActionOut;
  lang: Lang;
  isDone: boolean;
  onToggle: (action: ActionOut) => void;
  featured?: boolean;
}

function ActionItem({ action, lang, isDone, onToggle, featured }: ItemProps) {
  const t = UI[lang];
  const measurable = hasNumbers(action);
  const className = ["action", `g-${action.group}`, isDone && "is-done", featured && "action--featured"]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className}>
      <ActionMeta action={action} lang={lang} />
      <h3>{action.title}</h3>
      <p className="action__for">
        {t.forLabel}: {action.forWhom.join(", ")}
      </p>
      <p className="action__why">{action.why}</p>
      {action.note && (
        <p className="action__note">
          <Icon name="sparkle" size={16} />
          <span>
            <strong>{t.forHousehold}.</strong> {action.note}
          </span>
        </p>
      )}
      {measurable && <ImpactStats impact={action.impact} lang={lang} />}
      <HowCalculated assumption={action.assumption} lang={lang} />
      {!action.counted && <p className="muted">{t.pickOne}</p>}
      {measurable && (
        <label className="done">
          <input type="checkbox" checked={isDone} onChange={() => onToggle(action)} />
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
  onToggle: (action: ActionOut) => void;
}

export default function Actions({ plan, lang, doneIds, onToggle }: Props) {
  const t = UI[lang];
  const top = plan.actions.filter((action) => action.counted).slice(0, FEATURED_COUNT);
  const topIds = new Set(top.map((action) => action.id));
  // Everything else, grouped in the order ACTION_GROUPS lists the groups.
  const rest = ACTION_GROUPS.flatMap((group) =>
    plan.actions.filter((action) => action.group === group && !topIds.has(action.id)),
  );
  const renderItem = (action: ActionOut, featured = false) => (
    <ActionItem
      key={action.id}
      action={action}
      lang={lang}
      isDone={doneIds.has(action.id)}
      onToggle={onToggle}
      featured={featured}
    />
  );

  return (
    <>
      <section className="block" aria-labelledby="start-title">
        <h2 id="start-title">{t.startHere}</h2>
        <ol className="actions actions--top">{top.map((action) => renderItem(action, true))}</ol>
      </section>

      <Totals totals={plan.totals} lang={lang} />

      {rest.length > 0 && (
        <section className="block" aria-labelledby="more-title">
          <h2 id="more-title">{t.more}</h2>
          <ul className="actions actions--more">{rest.map((action) => renderItem(action))}</ul>
        </section>
      )}

      <FamilyTips tips={plan.ai.familyTips} lang={lang} />
    </>
  );
}
