"use client";

import { useEffect, useState } from "react";
import { api, isAbort } from "@/lib/client/api";
import { PLACE_QUERY_LENGTH, type Place } from "@/lib/types";

export type { Place };

const DEBOUNCE_MS = 300;

/** Debounced place search. Short queries show no list; stale requests are cancelled. */
export function usePlaceSearch() {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ term: string; places: Place[] } | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < PLACE_QUERY_LENGTH.min) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      api
        .search(term, ctl.signal)
        .then((places) => {
          if (!ctl.signal.aborted) setFound({ term, places });
        })
        .catch((e) => {
          if (!ctl.signal.aborted && !isAbort(e)) setFound({ term, places: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      ctl.abort();
      clearTimeout(timer);
    };
  }, [q]);

  // derived, so the effect never has to reset state for short queries
  const results = found?.term === q.trim() ? found.places : null;
  const clear = () => {
    setQ("");
    setFound(null);
  };
  return { q, setQ, results, clear };
}
