import type { CommuteMode, CookingFuel, HeatingType, WindowHabit } from "@/lib/types";
import type { IconName } from "./Icon";

/** One icon per answer option, shared by the form and the household summary. */
export const MODE_ICON: Record<CommuteMode, IconName> = {
  car: "car",
  bike: "bike",
  bus: "bus",
  metro: "metro",
  walk: "walk",
  wfh: "home",
};
export const COOKING_ICON: Record<CookingFuel, IconName> = { lpg: "lpg", png: "png", induction: "induction", biomass: "wood" };
export const HEATING_ICON: Record<HeatingType, IconName> = { none: "none", electric: "heater", biomass: "wood" };
export const WINDOW_ICON: Record<WindowHabit, IconName> = { open: "windowOpen", "mostly-closed": "windowShut" };
