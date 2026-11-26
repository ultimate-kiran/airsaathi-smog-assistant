import { AQI } from "../constants";
import { COPY, WHO } from "../copy";
import { makeAction, type Rule } from "../rule";

export const sensitivePlan: Rule = (c) => {
  if (!c.sensitive || c.aqi < AQI.PROTECT_FROM) return null;
  return makeAction(c, { id: "sensitive-plan", group: "health", text: COPY["sensitive-plan"](), forWhom: [WHO.sensitive] });
};

export const wasteBurning: Rule = (c) => {
  if (c.aqi < AQI.OPEN_BURNING_FROM) return null;
  return makeAction(c, { id: "no-open-burning", group: "community", text: COPY["no-open-burning"](), forWhom: [WHO.everyone] });
};
