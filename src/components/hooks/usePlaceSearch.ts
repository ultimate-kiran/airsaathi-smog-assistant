"use client";

import { useEffect, useState } from "react";
import { api, isAbort, type PlaceResult } from "@/lib/client/api";

export type Place = PlaceResult;

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

/** Debounced place search. Short queries show no list; stale requests are cancelled. */
export function usePlaceSearch() {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Place[] | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < MIN_CHARS) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      api
        .search(term, ctl.signal)
        .then(setFound)
        .catch((e) => {
          if (!isAbort(e)) setFound([]);
        });
    }, DEBOUNCE_MS);
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [q]);

  // derived, so the effect never has to reset state for short queries
  const results = q.trim().length < MIN_CHARS ? null : found;
  const clear = () => {
    setQ("");
    setFound(null);
  };
  return { q, setQ, results, clear };
}
