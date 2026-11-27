"use client";

import { useEffect, useState } from "react";
import { loadProfile, saveProfile } from "@/lib/storage";
import type { Lang, Place, Profile } from "@/lib/types";

/** A typical household, used until the visitor answers the questions. */
export const DEFAULT_PROFILE: Profile = {
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

type LoadPlan = (p: Profile) => Promise<boolean>;

/** Scrolls to and focuses the new plan, without smooth scrolling for people who ask for less motion. */
function revealPlan() {
  requestAnimationFrame(() => {
    const el = document.getElementById("plan");
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  });
}

/**
 * The visitor's profile and where they are in the flow. The profile is saved to the browser only
 * once a plan has been built from it, so a first-time visitor's choices stay unsaved until then.
 */
export function useHousehold(load: LoadPlan) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  /** false until the household questions are answered (or the typical household chosen) */
  const [tailored, setTailored] = useState(false);
  const [editing, setEditing] = useState(false);

  // Restore the saved household after mount (keeps server and client markup identical).
  useEffect(() => {
    const saved = loadProfile();
    if (!saved) return;
    // localStorage only exists in the browser, so it can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(saved);
    setTailored(true);
    void load(saved);
  }, [load]);

  /** A new place or language: keep the household, reload the plan. */
  function changeContext(next: Profile) {
    setProfile(next);
    if (tailored) saveProfile(next);
    if (next.place) void load(next);
  }

  function pick(place: Place) {
    changeContext({ ...profile, lat: place.lat, lon: place.lon, place: place.short });
  }

  function setLang(lang: Lang) {
    if (lang !== profile.lang) changeContext({ ...profile, lang });
  }

  async function build(next: Profile) {
    setProfile(next);
    saveProfile(next);
    setTailored(true);
    setEditing(false);
    if (await load(next)) revealPlan();
  }

  return {
    profile,
    tailored,
    editing,
    /** the questions show for a new household, or while editing a saved one */
    formOpen: !!profile.place && (!tailored || editing),
    pick,
    setLang,
    build,
    startEditing: () => setEditing(true),
    cancelEditing: () => setEditing(false),
  };
}
