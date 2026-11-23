"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { categoryByKey, categoryFor } from "@/lib/aqi";
import { APPROXIMATE_OVER_M, GeoError, formatAccuracy, locate as getFix, nameFor, round2 } from "@/lib/geo";
import { SAMPLE_PLACES, UI } from "@/lib/i18n";
import type { Lang, PlanView } from "@/lib/types";
import Gauge from "./Gauge";
import Icon from "./Icon";
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

  async function locate() {
    setBusy(true);
    setNote(t.locating);
    try {
      const fix = await getFix(typeof navigator === "undefined" ? undefined : navigator.geolocation);
      const lat = round2(fix.lat);
      const lon = round2(fix.lon);
      const named = await nameFor(lat, lon, lang);
      choose({ name: named?.name ?? `${lat}, ${lon}`, short: named?.short ?? t.locYours, lat, lon });
      // choose() clears the note, so say how good the fix was afterwards.
      const acc = formatAccuracy(fix.accuracy);
      setNote(fix.accuracy > APPROXIMATE_OVER_M ? t.locApprox(acc) : t.locFound(acc));
    } catch (e) {
      const kind = e instanceof GeoError ? e.kind : "unavailable";
      setNote(
        kind === "denied"
          ? t.locDenied
          : kind === "timeout"
            ? t.locTimeout
            : kind === "unsupported"
              ? t.locUnsupported
              : t.locUnavailable,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="search">
      <label htmlFor={id} className="search__label">
        {t.searchLabel}
      </label>
      <div className="search__box">
        <div className="search__field">
          <Icon name="search" />
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
        </div>
        <button type="button" className="btn btn--soft" onClick={() => void locate()} disabled={busy}>
          <Icon name="pin" size={18} />
          {t.useLocation}
        </button>
        <div id={`${id}-list`} className="search__pop" aria-live="polite">
          {results && results.length > 0 && (
            <ul className="search__list">
              {results.map((p) => (
                <li key={`${p.lat},${p.lon}`}>
                  <button type="button" onClick={() => choose(p)}>
                    <Icon name="pin" size={16} />
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {results && results.length === 0 && <p className="search__note">{t.noPlaces}</p>}
      {note && <p className="search__note">{note}</p>}
      <div className="search__try">
        <span>{t.tryThese}</span>
        {SAMPLE_PLACES.map((p) => (
          <button key={p.short} type="button" className="chip chip--glass" onClick={() => choose(p)}>
            {p.short}
          </button>
        ))}
      </div>
    </div>
  );
}

/** "Know today's air. Know what to do about it." reads as two short lines. */
function lines(text: string): string[] {
  return text.split(/(?<=[.।])\s+/);
}

export default function Hero({ lang, plan, placeName, status, error, onPick, onRetry }: Props) {
  const t = UI[lang];
  const aqi = plan?.aqi.value ?? 55;
  const cat = plan ? categoryByKey(plan.aqi.category) : categoryFor(55);
  const style = { "--tint": cat.color } as CSSProperties;
  const showReading = !!plan && status !== "error";

  return (
    <section className="hero" style={style} aria-labelledby="hero-title">
      <Skyline aqi={aqi} />
      <SkylineHaze aqi={aqi} />
      <div className="hero__inner">
        <PlaceSearch lang={lang} onPick={onPick} />

        {status === "loading" && (
          <p className="hero__status" role="status">
            <span className="dots" aria-hidden="true" />
            {t.checking(placeName ?? "…")}
          </p>
        )}

        {status === "error" && (
          <div className="hero__error" role="alert">
            <Icon name="alert" />
            <p>{error}</p>
            <button type="button" className="btn btn--soft" onClick={onRetry}>
              {t.retry}
            </button>
          </div>
        )}

        {showReading && plan ? (
          <div className="reading">
            <div className="reading__text">
              <p className="reading__place">
                <Icon name="pin" size={18} />
                {plan.place}
              </p>
              <h1 id="hero-title" className="hero__title hero__title--sm">
                {plan.ai.headline}
              </h1>
              <p className="reading__summary">{plan.ai.summary}</p>
              <p className="reading__cig">{t.cigarettes(plan.cigarettes)}</p>
              <ul className="facts">
                <li className="fact">
                  <Icon name="pin" size={16} />
                  {plan.source.kind === "station"
                    ? plan.source.count > 1
                      ? t.srcStations(plan.source.count, plan.source.km)
                      : t.srcStation(plan.source.name, plan.source.km)
                    : t.srcModel}
                </li>
                {plan.source.kind === "station" && plan.source.uncertain && (
                  <li className="fact fact--warn">
                    <Icon name="alert" size={16} />
                    {t.srcUncertain}
                  </li>
                )}
              </ul>
            </div>
            <div className="reading__dial">
              <p className="reading__dial-title">{t.aqiNow}</p>
              <Gauge aqi={plan.aqi.value} label={cat.label[lang]} />
              <span className="pill" style={{ background: cat.color, color: cat.ink }}>
                {cat.label[lang]}
              </span>
              <p className="reading__pm">PM2.5 {plan.aqi.pm25} µg/m³</p>
            </div>
          </div>
        ) : (
          <div className="hero__intro">
            <h1 id="hero-title" className="hero__title">
              {lines(t.heroTitle).map((l) => (
                <span key={l} className="hero__line">
                  {l}
                </span>
              ))}
            </h1>
            <p className="hero__lead">{t.heroLead}</p>
          </div>
        )}
      </div>
    </section>
  );
}
