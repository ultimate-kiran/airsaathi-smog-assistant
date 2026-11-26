import { AQI, K, TIME, TRIP } from "../constants";
import { COPY, WHO } from "../copy";
import { makeAction, type Rule } from "../rule";

const COMMUTE = "commute";

export const wfhSevere: Rule = (c) => {
  const { mode, km } = c.p.commute;
  if (!(mode === "car" || mode === "bike") || km < TRIP.MIN_WFH_KM || c.aqi < AQI.WFH_FROM) return null;
  const kmDay = km * 2;
  const co2 = kmDay * K.EF[mode];
  const inhaled = mode === "bike" ? c.avg.rush * K.VENT.light * (kmDay / TIME.BIKE_KMH) : 0;
  return makeAction(c, {
    id: "wfh-severe",
    group: "move",
    exclusive: COMMUTE,
    text: COPY["wfh-severe"]({ aqi: c.aqi, kmDay, co2 }),
    impact: { co2eKg: co2, ...(inhaled > 0 ? { inhaledPm25Ug: inhaled } : {}) },
    forWhom: [WHO.commuter],
  });
};

export const carToTransit: Rule = (c) => {
  const { mode, km } = c.p.commute;
  if (mode !== "car" || km < TRIP.MIN_CAR_SWAP_KM) return null;
  const kmDay = km * 2;
  return makeAction(c, {
    id: "car-to-transit",
    group: "move",
    exclusive: COMMUTE,
    text: COPY["car-to-transit"]({ km, kmDay }),
    impact: { co2eKg: kmDay * (K.EF.car - K.EF.transit) },
    forWhom: [WHO.commuter],
  });
};

export const carpool: Rule = (c) => {
  const { mode, km } = c.p.commute;
  if (mode !== "car" || km < TRIP.MIN_CAR_SWAP_KM) return null;
  const kmDay = km * 2;
  return makeAction(c, {
    id: "carpool",
    group: "move",
    exclusive: COMMUTE,
    text: COPY.carpool({ kmDay }),
    impact: { co2eKg: kmDay * K.EF.car * TRIP.CARPOOL_SHARE },
    forWhom: [WHO.commuter],
  });
};

export const commuteMask: Rule = (c) => {
  const { mode, km } = c.p.commute;
  if (!(mode === "bike" || mode === "walk" || mode === "bus") || c.aqi < AQI.MASK_FROM) return null;
  const hoursOut =
    mode === "bike"
      ? (2 * km) / TIME.BIKE_KMH
      : mode === "walk"
        ? Math.min((2 * km) / TIME.WALK_KMH, TIME.WALK_MAX_H)
        : TIME.BUS_EXPOSED_H;
  const vent = mode === "bike" ? K.VENT.light : K.VENT.walk;
  const avoided = c.avg.rush * vent * hoursOut * K.MASK_EFFECT;
  if (avoided < TRIP.MIN_MASK_UG) return null;
  return makeAction(c, {
    id: "commute-mask",
    group: "move",
    exclusive: COMMUTE,
    text: COPY["commute-mask"]({ minutesOut: hoursOut * 60, rushPm25: c.avg.rush }),
    impact: { inhaledPm25Ug: avoided },
    forWhom: [WHO.commuter],
  });
};
