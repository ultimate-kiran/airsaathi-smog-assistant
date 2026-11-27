"use client";

import { useEffect, useState } from "react";
import { UI } from "@/lib/i18n";
import { loadProfile, saveProfile } from "@/lib/storage";
import type { Lang, Place, Profile } from "@/lib/types";
import Actions from "./Actions";
import AskBox from "./AskBox";
import Header from "./Header";
import Hero from "./Hero";
import { useDoneLog } from "./hooks/useDoneLog";
import { usePlan } from "./hooks/usePlan";
import HourStrip from "./HourStrip";
import Icon from "./Icon";
import ProfileForm from "./ProfileForm";
import ShareBar from "./ShareBar";
import Summary from "./Summary";
import Tracker from "./Tracker";

const DEFAULT_PROFILE: Profile = {
  lat: 0,
  lon: 0,
  place: "",
  lang: "en",
  household: { adults: 2, children: 1, elders: 1, respiratory: false, heart: false, pregnant: false },
  commute: { mode: "car", km: 12 },
  cooking: "lpg",
  heating: "none",
  hasPurifier: false,
  windows: "open",
  exercise: { outdoor: true, minutes: 40 },
};

function revealPlan() {
  requestAnimationFrame(() => {
    const el = document.getElementById("plan");
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  });
}

/** Composition only: state lives in hooks, sections in their own components. */
export default function App() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  /** false until the household questions are answered (or the typical household chosen) */
  const [tailored, setTailored] = useState(false);
  const [editing, setEditing] = useState(false);
  const { plan, status, error, aiStatus, load } = usePlan();
  const done = useDoneLog();

  // Restore the saved household after mount (keeps server and client markup identical).
  useEffect(() => {
    const saved = loadProfile();
    if (!saved) return;
    // localStorage only exists in the browser, so it can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(saved);
    setTailored(true);
    void load(saved);
  }, [load]);

  function changeContext(next: Profile) {
    setProfile(next);
    if (tailored) saveProfile(next);
    if (next.place) void load(next);
  }

  function pick(place: Place) {
    changeContext({ ...profile, lat: place.lat, lon: place.lon, place: place.short });
  }

  function setLang(lang: Lang) {
    if (lang !== profile.lang) changeContext({ ...profile, lang });
  }

  async function build(next: Profile) {
    setProfile(next);
    saveProfile(next);
    setTailored(true);
    setEditing(false);
    if (await load(next)) revealPlan();
  }

  const lang = profile.lang;
  const t = UI[lang];
  const showForm = !!profile.place && (!tailored || editing);

  return (
    <div className="app" lang={lang}>
      <a className="skip" href="#results">
        {t.skip}
      </a>
      <Header lang={lang} onLang={setLang} />

      <main id="main">
        <Hero
          lang={lang}
          plan={plan}
          placeName={profile.place || null}
          status={status}
          error={error}
          onPick={pick}
          onRetry={() => void load(profile)}
        />

        <div className="wrap" id="results" tabIndex={-1}>
          {!profile.place && (
            <section className="how" aria-labelledby="how-title">
              <h2 id="how-title">{t.stepsTitle}</h2>
              <ol className="how__list">
                {t.steps.map((s) => (
                  <li key={s.title}>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {showForm && (
            <ProfileForm
              profile={profile}
              busy={status === "loading"}
              canSubmit={!!profile.place}
              editing={tailored}
              onSubmit={build}
              onCancel={() => setEditing(false)}
            />
          )}

          {tailored && !showForm && profile.place && <Summary profile={profile} onEdit={() => setEditing(true)} />}

          {tailored && plan && (
            <div id="plan" className="plan" tabIndex={-1} aria-busy={status === "loading" || aiStatus === "pending"}>
              <HourStrip plan={plan} lang={lang} />
              <Actions plan={plan} lang={lang} doneIds={done.doneIds} onToggle={done.toggle} />
              <div className="duo">
                <Tracker log={done.log} lang={lang} />
                <AskBox key={lang} profile={profile} />
              </div>
              <ShareBar plan={plan} lang={lang} />
              <p className="ai-note" aria-live="polite">
                <Icon name="sparkle" size={16} />
                <span>
                  {aiStatus === "pending" ? t.aiWriting : plan.ai.source === "ai" ? t.aiOn : t.aiOff}
                  {!plan.aiEnabled && ` ${t.aiOffHint}`}
                </span>
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="foot">
        <div className="foot__in">
          <p>{t.disclaimer}</p>
          <p>{t.sources}</p>
          <p>{t.privacy}</p>
        </div>
      </footer>
    </div>
  );
}
