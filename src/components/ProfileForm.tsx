"use client";

import { useState } from "react";
import { UI } from "@/lib/i18n";
import { PROFILE_LIMITS, type Profile } from "@/lib/types";
import { Choices, Slider, Stepper, Toggle } from "./formFields";
import Icon from "./Icon";
import { COOKING_ICON, HEATING_ICON, MODE_ICON, WINDOW_ICON } from "./iconMaps";

interface Props {
  profile: Profile;
  busy: boolean;
  canSubmit: boolean;
  /** true when the form is editing an existing plan, so it can offer Cancel */
  editing: boolean;
  onSubmit: (p: Profile) => void;
  onCancel: () => void;
}

/** The household answers the form may change; place and language belong to the page. */
type HouseholdEdits = Partial<Omit<Profile, "lang" | "lat" | "lon" | "place">>;

/** What every section needs: the draft profile and a way to change it. */
interface SectionProps {
  p: Profile;
  set: (patch: HouseholdEdits) => void;
}

function HouseholdSection({ p, set }: SectionProps) {
  const t = UI[p.lang];
  const hh = (patch: Partial<Profile["household"]>) => set({ household: { ...p.household, ...patch } });
  return (
    <section className="tailor__sec" aria-label={t.household}>
      <fieldset className="q">
        <legend>{t.household}</legend>
        <div className="steppers">
          <Stepper
            label={t.adults}
            value={p.household.adults}
            {...PROFILE_LIMITS.adults}
            onChange={(n) => hh({ adults: n })}
          />
          <Stepper
            label={t.children}
            value={p.household.children}
            {...PROFILE_LIMITS.children}
            onChange={(n) => hh({ children: n })}
          />
          <Stepper
            label={t.elders}
            value={p.household.elders}
            {...PROFILE_LIMITS.elders}
            onChange={(n) => hh({ elders: n })}
          />
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
  );
}

function CommuteSection({ p, set }: SectionProps) {
  const t = UI[p.lang];
  return (
    <section className="tailor__sec" aria-label={t.commute}>
      <Choices
        legend={t.commute}
        value={p.commute.mode}
        options={t.mode}
        icons={MODE_ICON}
        cols={3}
        onChange={(mode) => set({ commute: { ...p.commute, mode } })}
      />
      {p.commute.mode !== "wfh" && (
        <Slider
          label={t.km}
          unit={t.units.km}
          value={p.commute.km}
          {...PROFILE_LIMITS.commuteKm}
          onChange={(n) => set({ commute: { ...p.commute, km: n } })}
        />
      )}
    </section>
  );
}

function HomeSection({ p, set }: SectionProps) {
  const t = UI[p.lang];
  return (
    <section className="tailor__sec tailor__sec--wide" aria-label={t.home}>
      <div className="tailor__home">
        <Choices
          legend={t.cookingLabel}
          value={p.cooking}
          options={t.cooking}
          icons={COOKING_ICON}
          cols={2}
          onChange={(cooking) => set({ cooking })}
        />
        <Choices
          legend={t.heatingLabel}
          value={p.heating}
          options={t.heating}
          icons={HEATING_ICON}
          cols={3}
          onChange={(heating) => set({ heating })}
        />
        <div className="q">
          <Choices
            legend={t.windows}
            value={p.windows}
            options={t.windowHabit}
            icons={WINDOW_ICON}
            cols={2}
            onChange={(windows) => set({ windows })}
          />
          <div className="toggles toggles--after">
            <Toggle label={t.purifier} checked={p.hasPurifier} onChange={(b) => set({ hasPurifier: b })} />
          </div>
        </div>
        <ExerciseQuestion p={p} set={set} />
      </div>
    </section>
  );
}

function ExerciseQuestion({ p, set }: SectionProps) {
  const t = UI[p.lang];
  return (
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
          unit={t.units.min}
          value={p.exercise.minutes}
          {...PROFILE_LIMITS.exerciseMinutes}
          step={5}
          onChange={(n) => set({ exercise: { ...p.exercise, minutes: n } })}
        />
      )}
    </fieldset>
  );
}

function submitLabel(t: (typeof UI)[Profile["lang"]], busy: boolean, editing: boolean): string {
  if (busy) return t.updating;
  return editing ? t.update : t.buildPlan;
}

export default function ProfileForm({ profile, busy, canSubmit, editing, onSubmit, onCancel }: Props) {
  // Changes stay in this draft until submitted, so Cancel can simply drop them.
  const [edits, setEdits] = useState<HouseholdEdits>({});
  const p = { ...profile, ...edits };
  const t = UI[p.lang];
  const set = (patch: HouseholdEdits) => setEdits((prev) => ({ ...prev, ...patch }));
  const blocked = busy || !canSubmit;

  return (
    <form
      className="tailor"
      aria-labelledby="tailor-title"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(p);
      }}
    >
      <header className="tailor__head">
        <h2 id="tailor-title">{t.formTitle}</h2>
        <p>{t.formLead}</p>
      </header>

      <div className="tailor__grid">
        <HouseholdSection p={p} set={set} />
        <CommuteSection p={p} set={set} />
        <HomeSection p={p} set={set} />
      </div>

      <footer className="tailor__foot">
        <button type="submit" className="btn btn--primary btn--lg" disabled={blocked}>
          {submitLabel(t, busy, editing)}
          {!busy && <Icon name="send" size={18} />}
        </button>
        {editing ? (
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t.cancel}
          </button>
        ) : (
          <button type="button" className="linkish" onClick={() => onSubmit(profile)} disabled={blocked}>
            {t.useTypical}
          </button>
        )}
        {!canSubmit && <p className="muted">{t.pickPlaceFirst}</p>}
      </footer>
    </form>
  );
}
