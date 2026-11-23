"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { categoryByKey } from "@/lib/aqi";
import { UI } from "@/lib/i18n";
import {
  loadDone,
  loadProfile,
  localDate,
  saveDone,
  saveProfile,
  type DoneLog,
} from "@/lib/storage";
import type { ActionOut, Lang, PlanView, Profile } from "@/lib/types";
import Actions from "./Actions";
import AskBox from "./AskBox";
import Hero, { type Place } from "./Hero";
import HourStrip from "./HourStrip";
import ProfileForm from "./ProfileForm";
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

function shareText(plan: PlanView, lang: Lang): string {
  const cat = categoryByKey(plan.aqi.category).label[lang];
  const lines = [`AirSaathi · ${plan.place}`, `AQI ${plan.aqi.value} (${cat})`];
  if (plan.bestWindow) {
    lines.push(
      `${UI[lang].cleanest}: ${plan.bestWindow.start}–${plan.bestWindow.end} (AQI ~${plan.bestWindow.aqi})`,
    );
  }
  lines.push("");
  plan.actions.slice(0, 4).forEach((a) => lines.push(`• ${a.title}${a.window ? ` (${a.window})` : ""}`));
  return lines.join("\n");
}

export default function App() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [log, setLog] = useState<DoneLog>({});
  const [copied, setCopied] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  const run = useCallback(async (p: Profile) => {
    if (!p.place) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
        signal: c.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setStatus("error");
        return;
      }
      setPlan(data as PlanView);
      setStatus("idle");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError("Could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }, []);

  // Restore saved household and progress after mount (keeps server and client markup identical).
  useEffect(() => {
    const saved = loadProfile();
    // localStorage only exists in the browser, so it can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLog(loadDone());
    if (saved) {
      setProfile(saved);
      void run(saved);
    }
  }, [run]);

  const update = (p: Profile) => {
    setProfile(p);
    saveProfile(p);
  };

  const pick = (place: Place) => {
    const next = { ...profile, lat: place.lat, lon: place.lon, place: place.short };
    update(next);
    void run(next);
  };

  const setLang = (lang: Lang) => {
    if (lang === profile.lang) return;
    const next = { ...profile, lang };
    update(next);
    if (next.place) void run(next);
  };

  const lang = profile.lang;
  const t = UI[lang];
  const today = localDate();
  const doneIds = new Set((log[today] ?? []).map((e) => e.id));

  const toggle = (a: ActionOut) => {
    const entries = log[today] ?? [];
    const next: DoneLog = { ...log };
    if (entries.some((e) => e.id === a.id)) {
      next[today] = entries.filter((e) => e.id !== a.id);
    } else {
      next[today] = [...entries, { id: a.id, ug: a.impact.inhaledPm25Ug ?? 0, co2: a.impact.co2eKg ?? 0 }];
    }
    setLog(next);
    saveDone(next);
  };

  async function copy() {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(shareText(plan, lang));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="app" lang={lang}>
      <a className="skip" href="#main">
        {t.skip}
      </a>
      <header className="top">
        <div className="brand">
          <span className="brand__name">AirSaathi</span>
          <span className="brand__tag">{t.tagline}</span>
        </div>
        <div className="lang" role="group" aria-label={t.language}>
          <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
            English
          </button>
          <button type="button" aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">
            हिन्दी
          </button>
        </div>
      </header>

      <Hero
        lang={lang}
        plan={plan}
        placeName={profile.place || null}
        status={status}
        error={error}
        onPick={pick}
        onRetry={() => void run(profile)}
      />

      <div className="layout">
        <aside className="side" id="household">
          <ProfileForm
            profile={profile}
            busy={status === "loading"}
            canSubmit={!!profile.place}
            onChange={update}
            onSubmit={() => void run(profile)}
          />
        </aside>

        <main className="main" id="main" tabIndex={-1} aria-busy={status === "loading"}>
          {plan ? (
            <>
              <HourStrip plan={plan} lang={lang} />
              <Actions plan={plan} lang={lang} doneIds={doneIds} onToggle={toggle} />
              <Tracker log={log} lang={lang} />
              <AskBox profile={profile} enabled />
              <section className="block share" aria-labelledby="share-title">
                <h2 id="share-title">{t.shareTitle}</h2>
                <div className="share__row">
                  <a
                    className="btn btn--primary"
                    href={`https://wa.me/?text=${encodeURIComponent(shareText(plan, lang))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t.shareWhatsApp}
                  </a>
                  <button type="button" className="btn" onClick={() => void copy()}>
                    {copied ? t.copied : t.copy}
                  </button>
                </div>
              </section>
              <p className="muted ai-status">
                {plan.ai.source === "ai" ? t.aiOn : t.aiOff}
                {!plan.aiEnabled && ` ${t.aiOffHint}`}
              </p>
            </>
          ) : (
            <section className="block empty">
              <h2>{lang === "hi" ? "आपके प्लान में क्या होगा" : "What your plan will show"}</h2>
              <ul className="tips">
                <li>
                  {lang === "hi"
                    ? "अगले 24 घंटों में बाहर जाने का सबसे साफ़ समय, और जिन घंटों से बचना है।"
                    : "The cleanest hours to go out in the next 24, and the stretch to avoid."}
                </li>
                <li>
                  {lang === "hi"
                    ? "आपके परिवार, सफ़र, रसोई और घर के हिसाब से कदम, असर की संख्याओं के साथ।"
                    : "Steps matched to your family, commute, kitchen and home, each with the effect in numbers."}
                </li>
                <li>
                  {lang === "hi"
                    ? "आपके बचाए PM2.5 और CO₂ का हिसाब, जो दिन-ब-दिन जुड़ता है।"
                    : "A running tally of the PM2.5 and CO₂ you avoid, day by day."}
                </li>
              </ul>
            </section>
          )}
        </main>
      </div>

      <footer className="foot">
        <p>{t.disclaimer}</p>
        <p>{t.sources}</p>
        <p>{t.privacy}</p>
      </footer>
    </div>
  );
}
