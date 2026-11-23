"use client";

import { useId, type CSSProperties } from "react";
import { UI } from "@/lib/i18n";
import type { Profile } from "@/lib/types";
import Icon, { type IconName } from "./Icon";

interface Props {
  profile: Profile;
  busy: boolean;
  canSubmit: boolean;
  /** true when the form is editing an existing plan, so it can offer Cancel */
  editing: boolean;
  onChange: (p: Profile) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const MODE_ICON: Record<string, IconName> = {
  car: "car",
  bike: "bike",
  bus: "bus",
  metro: "metro",
  walk: "walk",
  wfh: "home",
};
const COOKING_ICON: Record<string, IconName> = { lpg: "lpg", png: "png", induction: "induction", biomass: "wood" };
const HEATING_ICON: Record<string, IconName> = { none: "none", electric: "heater", biomass: "wood" };

/** A person counter: big + and − buttons, easier than a number box on a phone. */
function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div className="stepper" role="group" aria-labelledby={id}>
      <span id={id} className="stepper__label">
        {label}
      </span>
      <div className="stepper__ctl">
        <button type="button" aria-label={`${label}: −1`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Icon name="minus" size={18} />
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`${label}: +1`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}

/** Pick one: large tiles with an icon, built on real radio inputs. */
function Choices({
  legend,
  value,
  options,
  icons,
  cols,
  onChange,
}: {
  legend: string;
  value: string;
  options: Record<string, string>;
  icons: Record<string, IconName>;
  cols: number;
  onChange: (v: string) => void;
}) {
  const name = useId();
  return (
    <fieldset className="q">
      <legend>{legend}</legend>
      <div className="choices" style={{ "--cols": cols } as CSSProperties}>
        {Object.entries(options).map(([k, label]) => (
          <div className="choice" key={k}>
            <input type="radio" id={`${name}-${k}`} name={name} checked={value === k} onChange={() => onChange(k)} />
            <label htmlFor={`${name}-${k}`}>
              <Icon name={icons[k]} size={24} />
              <span>{label}</span>
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Yes/no as a pill that fills in when selected. */
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  const id = useId();
  return (
    <div className="toggle">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span className="toggle__tick">
          <Icon name="check" size={14} />
        </span>
        {label}
      </label>
    </div>
  );
}

function Slider({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="range">
      <div className="range__head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {value} <span>{unit}</span>
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export default function ProfileForm({ profile: p, busy, canSubmit, editing, onChange, onSubmit, onCancel }: Props) {
  const t = UI[p.lang];
  const set = (patch: Partial<Profile>) => onChange({ ...p, ...patch });
  const hh = (patch: Partial<Profile["household"]>) => set({ household: { ...p.household, ...patch } });
  const unitKm = p.lang === "hi" ? "किमी" : "km";
  const unitMin = p.lang === "hi" ? "मिनट" : "min";

  return (
    <form
      className="tailor"
      aria-labelledby="tailor-title"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <header className="tailor__head">
        <h2 id="tailor-title">{t.formTitle}</h2>
        <p>{t.formLead}</p>
      </header>

      <div className="tailor__grid">
        <section className="tailor__sec" aria-label={t.household}>
          <fieldset className="q">
            <legend>{t.household}</legend>
            <div className="steppers">
              <Stepper label={t.adults} value={p.household.adults} min={1} max={12} onChange={(n) => hh({ adults: n })} />
              <Stepper label={t.children} value={p.household.children} min={0} max={12} onChange={(n) => hh({ children: n })} />
              <Stepper label={t.elders} value={p.household.elders} min={0} max={12} onChange={(n) => hh({ elders: n })} />
            </div>
          </fieldset>
          <fieldset className="q">
            <legend>{t.healthPrompt}</legend>
            <div className="toggles">
              <Toggle label={t.respiratory} checked={p.household.respiratory} onChange={(b) => hh({ respiratory: b })} />
              <Toggle label={t.heart} checked={p.household.heart} onChange={(b) => hh({ heart: b })} />
              <Toggle label={t.pregnant} checked={p.household.pregnant} onChange={(b) => hh({ pregnant: b })} />
            </div>
          </fieldset>
        </section>

        <section className="tailor__sec" aria-label={t.commute}>
          <Choices
            legend={t.commute}
            value={p.commute.mode}
            options={t.mode}
            icons={MODE_ICON}
            cols={3}
            onChange={(v) => set({ commute: { ...p.commute, mode: v as Profile["commute"]["mode"] } })}
          />
          {p.commute.mode !== "wfh" && (
            <Slider
              label={t.km}
              unit={unitKm}
              value={p.commute.km}
              min={0}
              max={100}
              onChange={(n) => set({ commute: { ...p.commute, km: n } })}
            />
          )}
        </section>

        <section className="tailor__sec tailor__sec--wide" aria-label={t.home}>
          <div className="tailor__home">
            <Choices
              legend={t.cookingLabel}
              value={p.cooking}
              options={t.cooking}
              icons={COOKING_ICON}
              cols={2}
              onChange={(v) => set({ cooking: v as Profile["cooking"] })}
            />
            <Choices
              legend={t.heatingLabel}
              value={p.heating}
              options={t.heating}
              icons={HEATING_ICON}
              cols={3}
              onChange={(v) => set({ heating: v as Profile["heating"] })}
            />
            <div className="q">
              <Choices
                legend={t.windows}
                value={p.windows}
                options={{ open: t.windowsOpen, "mostly-closed": t.windowsClosed }}
                icons={{ open: "windowOpen", "mostly-closed": "windowShut" }}
                cols={2}
                onChange={(v) => set({ windows: v as Profile["windows"] })}
              />
              <div className="toggles toggles--after">
                <Toggle label={t.purifier} checked={p.hasPurifier} onChange={(b) => set({ hasPurifier: b })} />
              </div>
            </div>
            <fieldset className="q">
              <legend>{t.exercise}</legend>
              <div className="toggles">
                <Toggle
                  label={t.exerciseOutdoor}
                  checked={p.exercise.outdoor}
                  onChange={(b) => set({ exercise: { ...p.exercise, outdoor: b } })}
                />
              </div>
              {p.exercise.outdoor && (
                <Slider
                  label={t.minutes}
                  unit={unitMin}
                  value={p.exercise.minutes}
                  min={0}
                  max={180}
                  step={5}
                  onChange={(n) => set({ exercise: { ...p.exercise, minutes: n } })}
                />
              )}
            </fieldset>
          </div>
        </section>
      </div>

      <footer className="tailor__foot">
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy || !canSubmit}>
          {busy ? t.updating : editing ? t.update : t.buildPlan}
          {!busy && <Icon name="send" size={18} />}
        </button>
        {editing ? (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t.cancel}
          </button>
        ) : (
          <button type="button" className="linkish" onClick={onSubmit} disabled={busy || !canSubmit}>
            {t.useTypical}
          </button>
        )}
        {!canSubmit && <p className="muted">{t.pickPlaceFirst}</p>}
      </footer>
    </form>
  );
}
