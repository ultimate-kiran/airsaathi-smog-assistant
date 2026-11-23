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
import Icon, { type IconName } from "./Icon";
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

const MODE_ICON: Record<string, IconName> = {
  car: "car",
  bike: "bike",
  bus: "bus",
  metro: "metro",
  walk: "walk",
  wfh: "home",
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

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" width="34" height="34" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="logo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14303b" />
          <stop offset="1" stopColor="#0a1a26" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#logo-sky)" />
      <circle cx="21.5" cy="11" r="4.2" fill="#f6c872" />
      <path
        d="M6 17.5h13a2.6 2.6 0 1 0-2.6-2.6M6 22h17.5a2.6 2.6 0 1 1-2.6 2.6M6 26.5h8"
        fill="none"
        stroke="#6fe0c5"
        strokeWidth="1.8"
        strokeLinecap="round"
        transform="translate(0 -3)"
      />
    </svg>
  );
}

/** One line that restates the household, with an Edit button, once the plan exists. */
function Summary({ profile: p, onEdit }: { profile: Profile; onEdit: () => void }) {
  const t = UI[p.lang];
  const h = p.household;
  const items: string[] = [
    `${t.adults}: ${h.adults}`,
    ...(h.children > 0 ? [`${t.children}: ${h.children}`] : []),
    ...(h.elders > 0 ? [`${t.elders}: ${h.elders}`] : []),
    ...(h.respiratory ? [t.respiratory] : []),
    ...(h.heart ? [t.heart] : []),
    ...(h.pregnant ? [t.pregnant] : []),
  ];
  const home = [t.cooking[p.cooking], p.windows === "open" ? t.windowsOpen : t.windowsClosed];
  if (p.hasPurifier) home.push(t.purifier);
  return (
    <section className="summary" aria-labelledby="summary-title">
      <div className="summary__body">
        <h2 id="summary-title">{t.formTitle}</h2>
        <ul className="summary__chips">
          {items.map((s) => (
            <li key={s}>{s}</li>
          ))}
          <li>
            <Icon name={MODE_ICON[p.commute.mode]} size={16} />
            {t.mode[p.commute.mode]}
            {p.commute.mode !== "wfh" && ` · ${p.commute.km} ${p.lang === "hi" ? "किमी" : "km"}`}
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

export default function App() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [log, setLog] = useState<DoneLog>({});
  const [copied, setCopied] = useState(false);
  /** false until the person has answered the household questions (or chosen the typical household) */
  const [tailored, setTailored] = useState(false);
  const [editing, setEditing] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  const run = useCallback(async (p: Profile): Promise<boolean> => {
    if (!p.place) return false;
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
        return false;
      }
      setPlan(data as PlanView);
      setStatus("idle");
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return false;
      setError("Could not reach the server. Check your connection and try again.");
      setStatus("error");
      return false;
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
      setTailored(true);
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

  /** Builds (or rebuilds) the plan from the current answers, then brings it into view. */
  async function build() {
    setTailored(true);
    setEditing(false);
    const ok = await run(profile);
    if (!ok) return;
    requestAnimationFrame(() => {
      const el = document.getElementById("plan");
      if (!el) return;
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
      el.focus({ preventScroll: true });
    });
  }

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

  const showForm = !!profile.place && (!tailored || editing);

  return (
    <div className="app" lang={lang}>
      <a className="skip" href="#results">
        {t.skip}
      </a>
      <header className="top">
        <div className="top__in">
          <div className="brand">
            <Logo />
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
        </div>
      </header>

      <main id="main">
        <Hero
          lang={lang}
          plan={plan}
          placeName={profile.place || null}
          status={status}
          error={error}
          onPick={pick}
          onRetry={() => void run(profile)}
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
              onChange={update}
              onSubmit={() => void build()}
              onCancel={() => setEditing(false)}
            />
          )}

          {tailored && !showForm && profile.place && <Summary profile={profile} onEdit={() => setEditing(true)} />}

          {tailored && plan && (
            <div id="plan" className="plan" tabIndex={-1} aria-busy={status === "loading"}>
              <HourStrip plan={plan} lang={lang} />
              <Actions plan={plan} lang={lang} doneIds={doneIds} onToggle={toggle} />
              <div className="duo">
                <Tracker log={log} lang={lang} />
                <AskBox profile={profile} enabled />
              </div>
              <section className="share" aria-labelledby="share-title">
                <h2 id="share-title">{t.shareTitle}</h2>
                <div className="share__row">
                  <a
                    className="btn btn--primary"
                    href={`https://wa.me/?text=${encodeURIComponent(shareText(plan, lang))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="share" size={18} />
                    {t.shareWhatsApp}
                  </a>
                  <button type="button" className="btn btn--outline" onClick={() => void copy()}>
                    <Icon name={copied ? "check" : "copy"} size={18} />
                    {copied ? t.copied : t.copy}
                  </button>
                </div>
              </section>
              <p className="ai-note">
                <Icon name="sparkle" size={16} />
                <span>
                  {plan.ai.source === "ai" ? t.aiOn : t.aiOff}
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
