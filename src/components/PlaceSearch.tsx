"use client";

import { useId } from "react";
import { SAMPLE_PLACES, UI } from "@/lib/i18n";
import type { Lang } from "@/lib/types";
import { useLocate } from "./hooks/useLocate";
import { usePlaceSearch, type Place } from "./hooks/usePlaceSearch";
import Icon from "./Icon";

export default function PlaceSearch({ lang, onPick }: { lang: Lang; onPick: (p: Place) => void }) {
  const t = UI[lang];
  const id = useId();
  const search = usePlaceSearch();
  const located = useLocate(lang, (p) => {
    search.clear();
    onPick(p);
  });

  function choose(p: Place) {
    search.clear();
    located.setNote("");
    onPick(p);
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
            value={search.q}
            onChange={(e) => search.setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            maxLength={60}
            aria-controls={`${id}-list`}
          />
        </div>
        <button type="button" className="btn btn--soft" onClick={() => void located.run()} disabled={located.busy}>
          <Icon name="pin" size={18} />
          {t.useLocation}
        </button>
        <div id={`${id}-list`} className="search__pop" aria-live="polite">
          {search.results && search.results.length > 0 && (
            <ul className="search__list">
              {search.results.map((p) => (
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
      {search.results && search.results.length === 0 && <p className="search__note">{t.noPlaces}</p>}
      {located.note && <p className="search__note">{located.note}</p>}
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
