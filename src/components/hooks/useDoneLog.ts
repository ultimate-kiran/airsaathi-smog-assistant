"use client";

import { useCallback, useEffect, useState } from "react";
import { loadDone, localDate, saveDone, type DoneLog } from "@/lib/storage";
import type { ActionOut } from "@/lib/types";

const EMPTY: DoneLog = {};

/** The "I did this today" log, kept in this browser only. */
export function useDoneLog() {
  // null until the saved log has been read, so nothing is ever saved over it
  const [stored, setStored] = useState<DoneLog | null>(null);

  // localStorage only exists in the browser, so it is read after hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStored(loadDone());
  }, []);

  useEffect(() => {
    if (stored) saveDone(stored);
  }, [stored]);

  const log = stored ?? EMPTY;
  const doneIds = new Set((log[localDate()] ?? []).map((e) => e.id));

  const toggle = useCallback((a: ActionOut) => {
    setStored((prev) => {
      const base = prev ?? {};
      const day = localDate();
      const entries = base[day] ?? [];
      return {
        ...base,
        [day]: entries.some((e) => e.id === a.id)
          ? entries.filter((e) => e.id !== a.id)
          : [...entries, { id: a.id, ug: a.impact.inhaledPm25Ug ?? 0, co2: a.impact.co2eKg ?? 0 }],
      };
    });
  }, []);

  return { log, doneIds, toggle };
}
