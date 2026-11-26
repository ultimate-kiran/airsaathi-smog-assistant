"use client";

import type { CSSProperties } from "react";
import { categoryByKey, categoryFor } from "@/lib/aqi";
import { UI } from "@/lib/i18n";
import type { ErrorCode, Lang, PlanView } from "@/lib/types";
import Gauge from "./Gauge";
import type { Place } from "./hooks/usePlaceSearch";
import Icon from "./Icon";
import PlaceSearch from "./PlaceSearch";
import Skyline, { SkylineHaze } from "./Skyline";

export type { Place };

interface Props {
  lang: Lang;
  plan: PlanView | null;
  placeName: string | null;
  status: "idle" | "loading" | "error";
  error: ErrorCode | null;
  onPick: (p: Place) => void;
  onRetry: () => void;
}

/** The AQI shown before any place is chosen: the calm, clear-sky scene. */
const IDLE_AQI = 55;

/** "Know today's air. Know what to do about it." reads as two short lines. */
function lines(text: string): string[] {
  return text.split(/(?<=[.।])\s+/);
}

function SourceFacts({ plan, lang }: { plan: PlanView; lang: Lang }) {
  const t = UI[lang];
  const s = plan.source;
  return (
    <ul className="facts">
      <li className="fact">
        <Icon name="pin" size={16} />
        {s.kind === "station" ? (s.count > 1 ? t.srcStations(s.count, s.km) : t.srcStation(s.name, s.km)) : t.srcModel}
      </li>
      {s.kind === "station" && s.uncertain && (
        <li className="fact fact--warn">
          <Icon name="alert" size={16} />
          {t.srcUncertain}
        </li>
      )}
    </ul>
  );
}

export default function Hero({ lang, plan, placeName, status, error, onPick, onRetry }: Props) {
  const t = UI[lang];
  const aqi = plan?.aqi.value ?? IDLE_AQI;
  const cat = plan ? categoryByKey(plan.aqi.category) : categoryFor(IDLE_AQI);
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
            <p>{t.errors[error ?? "network"]}</p>
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
              <SourceFacts plan={plan} lang={lang} />
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
