import { K, TIME } from "../constants";
import { COPY, WHO } from "../copy";
import { makeAction, type Rule } from "../rule";

export const indoorBurning: Rule = (c) => {
  if (c.p.heating !== "biomass") return null;
  return makeAction(c, {
    id: "stop-indoor-burning",
    group: "kitchen",
    text: COPY["stop-indoor-burning"](),
    impact: { inhaledPm25Ug: K.BIOMASS_HEAT_UG * K.VENT.rest * TIME.HEATING_FIRE_H },
    forWhom: [WHO.everyone],
  });
};

export const cookingFuel: Rule = (c) => {
  if (c.p.cooking !== "biomass") return null;
  return makeAction(c, {
    id: "clean-cooking",
    group: "kitchen",
    text: COPY["clean-cooking"](),
    impact: { inhaledPm25Ug: K.BIOMASS_COOK_UG * K.VENT.cooking * TIME.COOKING_H },
    forWhom: [WHO.cook],
  });
};

export const kitchenExhaust: Rule = (c) => {
  if (c.p.cooking !== "lpg" && c.p.cooking !== "png") return null;
  return makeAction(c, { id: "kitchen-exhaust", group: "kitchen", text: COPY["kitchen-exhaust"](), forWhom: [WHO.cook] });
};
