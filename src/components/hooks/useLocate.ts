"use client";

import { useState } from "react";
import { APPROXIMATE_OVER_M, GeoError, formatAccuracy, locate, nameFor, round2 } from "@/lib/geo";
import { UI } from "@/lib/i18n";
import type { Lang, Place } from "@/lib/types";

/** "Use my location": best device fix, then a place name, with a message that says how it went. */
export function useLocate(lang: Lang, onFound: (p: Place) => void) {
  const t = UI[lang];
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function run() {
    setBusy(true);
    setNote(t.locating);
    try {
      const fix = await locate(typeof navigator === "undefined" ? undefined : navigator.geolocation);
      const lat = round2(fix.lat);
      const lon = round2(fix.lon);
      const named = await nameFor(lat, lon, lang);
      onFound({ name: named?.name ?? `${lat}, ${lon}`, short: named?.short ?? t.locYours, lat, lon });
      const acc = formatAccuracy(fix.accuracy);
      setNote(fix.accuracy > APPROXIMATE_OVER_M ? t.locApprox(acc) : t.locFound(acc));
    } catch (e) {
      const kind = e instanceof GeoError ? e.kind : "unavailable";
      const messages = { denied: t.locDenied, timeout: t.locTimeout, unsupported: t.locUnsupported, unavailable: t.locUnavailable };
      setNote(messages[kind]);
    } finally {
      setBusy(false);
    }
  }

  return { busy, note, setNote, run };
}
