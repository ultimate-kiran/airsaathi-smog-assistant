import { UI } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import Icon from "./Icon";
import { MODE_ICON } from "./iconMaps";

/** One line that restates the household, with an Edit button, once the plan exists. */
export default function Summary({ profile: p, onEdit }: { profile: Profile; onEdit: () => void }) {
  const t = UI[p.lang];
  const h = p.household;
  const people: string[] = [
    `${t.adults}: ${h.adults}`,
    ...(h.children > 0 ? [`${t.children}: ${h.children}`] : []),
    ...(h.elders > 0 ? [`${t.elders}: ${h.elders}`] : []),
    ...(h.respiratory ? [t.respiratory] : []),
    ...(h.heart ? [t.heart] : []),
    ...(h.pregnant ? [t.pregnant] : []),
  ];
  const home = [t.cooking[p.cooking], t.windowHabit[p.windows], ...(p.hasPurifier ? [t.purifier] : [])];
  return (
    <section className="summary" aria-labelledby="summary-title">
      <div className="summary__body">
        <h2 id="summary-title">{t.formTitle}</h2>
        <ul className="summary__chips">
          {people.map((s) => (
            <li key={s}>{s}</li>
          ))}
          <li>
            <Icon name={MODE_ICON[p.commute.mode]} size={16} />
            {t.mode[p.commute.mode]}
            {p.commute.mode !== "wfh" && ` · ${p.commute.km} ${t.units.km}`}
          </li>
          {home.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <button type="button" className="btn btn--soft-dark" onClick={onEdit}>
        <Icon name="edit" size={18} />
        {t.editHousehold}
      </button>
    </section>
  );
}
