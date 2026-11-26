import { AQI, K, TIME } from "../constants";
import { COPY, WHO } from "../copy";
import { makeAction, type Rule } from "../rule";

export const purifier: Rule = (c) => {
  if (c.aqi < AQI.PROTECT_FROM) return null;
  const before = c.avg.night * (c.p.windows === "open" ? K.F_OPEN : K.F_CLOSED);
  return makeAction(c, {
    id: "bedroom-purifier",
    group: "indoor",
    text: COPY["bedroom-purifier"]({ has: c.p.hasPurifier, nightPm25: c.avg.night }),
    impact: { inhaledPm25Ug: before * K.PURIFIER_CUT * K.VENT.sleep * TIME.SLEEP_H },
    forWhom: [WHO.everyone],
  });
};

export const smartVentilation: Rule = (c) => {
  if (c.p.windows !== "open" || c.aqi < AQI.PROTECT_FROM) return null;
  return makeAction(c, {
    id: "smart-ventilation",
    group: "indoor",
    text: COPY["smart-ventilation"]({ window: c.bestHour, dayPm25: c.avg.day }),
    impact: { inhaledPm25Ug: c.avg.day * (K.F_OPEN - K.F_CLOSED) * K.VENT.rest * TIME.AWAKE_AT_HOME_H },
    window: c.bestHour ?? undefined,
    forWhom: [WHO.everyone],
  });
};

export const airOutWhenClean: Rule = (c) => {
  if (c.aqi >= AQI.PROTECT_FROM) return null;
  return makeAction(c, { id: "air-out", group: "indoor", text: COPY["air-out"](), forWhom: [WHO.everyone] });
};
