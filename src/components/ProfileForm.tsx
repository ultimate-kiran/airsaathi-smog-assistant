"use client";

import { useId } from "react";
import { UI } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

interface Props {
  profile: Profile;
  busy: boolean;
  canSubmit: boolean;
  onChange: (p: Profile) => void;
  onSubmit: () => void;
}

function Num({
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
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : min);
        }}
      />
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  const id = useId();
  return (
    <div className="check">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

function Pick({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (v: string) => void;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ProfileForm({ profile: p, busy, canSubmit, onChange, onSubmit }: Props) {
  const t = UI[p.lang];
  const set = (patch: Partial<Profile>) => onChange({ ...p, ...patch });
  const hh = (patch: Partial<Profile["household"]>) => set({ household: { ...p.household, ...patch } });

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h2>{t.formTitle}</h2>

      <fieldset>
        <legend>{t.household}</legend>
        <div className="row3">
          <Num label={t.adults} value={p.household.adults} min={1} max={12} onChange={(n) => hh({ adults: n })} />
          <Num label={t.children} value={p.household.children} min={0} max={12} onChange={(n) => hh({ children: n })} />
          <Num label={t.elders} value={p.household.elders} min={0} max={12} onChange={(n) => hh({ elders: n })} />
        </div>
        <Check label={t.respiratory} checked={p.household.respiratory} onChange={(b) => hh({ respiratory: b })} />
        <Check label={t.heart} checked={p.household.heart} onChange={(b) => hh({ heart: b })} />
        <Check label={t.pregnant} checked={p.household.pregnant} onChange={(b) => hh({ pregnant: b })} />
      </fieldset>

      <fieldset>
        <legend>{t.commute}</legend>
        <Pick
          label={t.commute}
          value={p.commute.mode}
          options={t.mode}
          onChange={(v) => set({ commute: { ...p.commute, mode: v as Profile["commute"]["mode"] } })}
        />
        {p.commute.mode !== "wfh" && (
          <Num label={t.km} value={p.commute.km} min={0} max={100} onChange={(n) => set({ commute: { ...p.commute, km: n } })} />
        )}
      </fieldset>

      <fieldset>
        <legend>{t.home}</legend>
        <Pick
          label={t.cookingLabel}
          value={p.cooking}
          options={t.cooking}
          onChange={(v) => set({ cooking: v as Profile["cooking"] })}
        />
        <Pick
          label={t.heatingLabel}
          value={p.heating}
          options={t.heating}
          onChange={(v) => set({ heating: v as Profile["heating"] })}
        />
        <Pick
          label={t.windows}
          value={p.windows}
          options={{ open: t.windowsOpen, "mostly-closed": t.windowsClosed }}
          onChange={(v) => set({ windows: v as Profile["windows"] })}
        />
        <Check label={t.purifier} checked={p.hasPurifier} onChange={(b) => set({ hasPurifier: b })} />
      </fieldset>

      <fieldset>
        <legend>{t.exercise}</legend>
        <Check
          label={t.exerciseOutdoor}
          checked={p.exercise.outdoor}
          onChange={(b) => set({ exercise: { ...p.exercise, outdoor: b } })}
        />
        {p.exercise.outdoor && (
          <Num
            label={t.minutes}
            value={p.exercise.minutes}
            min={0}
            max={180}
            onChange={(n) => set({ exercise: { ...p.exercise, minutes: n } })}
          />
        )}
      </fieldset>

      <button type="submit" className="btn btn--primary" disabled={busy || !canSubmit}>
        {busy ? t.updating : t.update}
      </button>
      {!canSubmit && <p className="muted">{t.pickPlaceFirst}</p>}
    </form>
  );
}
