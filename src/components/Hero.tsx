"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { categoryByKey, categoryFor } from "@/lib/aqi";
import { SAMPLE_PLACES, UI } from "@/lib/i18n";
import type { Lang, PlanView } from "@/lib/types";
import Skyline, { SkylineHaze } from "./Skyline";

export interface Place {
  name: string;
  short: string;
  lat: number;
  lon: number;
}

interface Props {
  lang: Lang;
  plan: PlanView | null;
  placeName: string | null;
  status: "idle" | "loading" | "error";
  error: string;
  onPick: (p: Place) => void;
  onRetry: () => void;
}

function PlaceSearch({ lang, onPick }: { lang: Lang; onPick: (p: Place) => void }) {
  const t = UI[lang];
  const id = useId();
  const [q, setQ] = useState("");
  const [found, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) return;
    const ctl = new AbortController();
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const data = await res.json();
        setResults(res.ok ? (data.places as Place[]) : []);
      } catch {
        /* aborted or offline: keep the previous list */
      }
    }, 300);
    return () => {
      ctl.abort();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  // Short queries show no list; derived here so the effect never has to reset state.
  const results = q.trim().length < 2 ? null : found;

  function choose(p: Place) {
    setQ("");
    setResults(null);
    setNote("");
    onPick(p);
  }

  function locate() {
    if (!("geolocation" in navigator)) {
      setNote("Your browser cannot share its location. Search for your city instead.");
      return;
    }
    setBusy(true);
    setNote(t.locating);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        setNote("");
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        choose({ name: `${lat}, ${lon}`, short: lang === "hi" ? "आपकी लोकेशन" : "Your location", lat, lon });
      },
      () => {
        setBusy(false);
        setNote("We could not get your location. Search for your city instead.");
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }

  return (
    <div className="search">
      <label htmlFor={id} className="search__label">
        {t.searchLabel}
      </label>
      <div className="search__row">
        <input
          id={id}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          autoComplete="off"
          maxLength={60}
          aria-controls={`${id}-list`}
        />
        <button type="button" className="btn btn--quiet" onClick={locate} disabled={busy}>
          {t.useLocation}
        </button>
      </div>
      <div id={`${id}-list`} aria-live="polite">
        {results && results.length > 0 && (
          <ul className="search__list">
            {results.map((p) => (
              <li key={`${p.lat},${p.lon}`}>
                <button type="button" onClick={() => choose(p)}>
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {results && results.length === 0 && <p className="search__note">{t.noPlaces}</p>}
        {note && <p className="search__note">{note}</p>}
      </div>
      <p className="search__try">
        <span>{t.tryThese}</span>
        {SAMPLE_PLACES.map((p) => (
          <button key={p.short} type="button" className="chip" onClick={() => choose(p)}>
            {p.short}
          </button>
        ))}
      </p>
    </div>
  );
}

export default function Hero({ lang, plan, placeName, status, error, onPick, onRetry }: Props) {
  const t = UI[lang];
  const aqi = plan?.aqi.value ?? 55;
  const cat = plan ? categoryByKey(plan.aqi.category) : categoryFor(55);
  const style = { "--tint": cat.color } as CSSProperties;

  return (
    <section className="hero" style={style} aria-labelledby="hero-title">
      <Skyline aqi={plan ? aqi : 55} />
      <SkylineHaze aqi={plan ? aqi : 55} />
      <div className="hero__inner">
        <PlaceSearch lang={lang} onPick={onPick} />

        {status === "loading" && (
          <p className="hero__status" role="status">
            {t.checking(placeName ?? "…")}
          </p>
        )}

        {status === "error" && (
          <div className="hero__error" role="alert">
            <p>{error}</p>
            <button type="button" className="btn" onClick={onRetry}>
              {t.retry}
            </button>
          </div>
        )}

        {plan && status !== "error" ? (
          <div className="hero__reading">
            <p className="hero__place">{plan.place}</p>
            <div className="hero__numbers">
              <span className="hero__aqi">
                <span className="sr-only">{t.aqiNow} </span>
                {plan.aqi.value}
              </span>
              <div>
                <span className="pill" style={{ background: cat.color, color: cat.ink }}>
                  {cat.label[lang]}
                </span>
                <p className="hero__meta">
                  {t.aqiNow} · PM2.5 {plan.aqi.pm25} µg/m³
                </p>
                <p className="hero__meta">
                  {plan.source.kind === "station"
                    ? plan.source.count > 1
                      ? t.srcStations(plan.source.count, plan.source.km)
                      : t.srcStation(plan.source.name, plan.source.km)
                    : t.srcModel}
                </p>
                {plan.source.kind === "station" && plan.source.uncertain && (
                  <p className="hero__meta hero__meta--warn">{t.srcUncertain}</p>
                )}
              </div>
            </div>
            <h1 id="hero-title" className="hero__headline">
              {plan.ai.headline}
            </h1>
            <p className="hero__summary">{plan.ai.summary}</p>
            <p className="hero__cig">{t.cigarettes(plan.cigarettes)}</p>
            <a className="hero__jump" href="#household">
              {t.editHousehold}
            </a>
          </div>
        ) : (
          status !== "loading" && (
            <div className="hero__intro">
              <h1 id="hero-title" className="hero__headline">
                {t.heroTitle}
              </h1>
              <p className="hero__summary">{t.heroLead}</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
