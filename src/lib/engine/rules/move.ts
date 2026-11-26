import { round1 } from "../../format";
import { AQI, K, TIME, TRIP } from "../constants";
import { L, WHO, makeAction, r0, pct, type Rule } from "../rule";

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
    priority: 78,
    title: L("Work from home today if you can", "हो सके तो आज घर से काम करें"),
    why: L(
      `AQI is ${c.aqi} today. Skipping the ${kmDay} km round trip avoids both your own exposure in traffic and about ${round1(co2)} kg of CO₂.`,
      `आज AQI ${c.aqi} है। ${kmDay} किमी का आना-जाना बचाने से ट्रैफ़िक में आपका एक्सपोज़र और लगभग ${round1(co2)} किग्रा CO₂ दोनों बचते हैं।`,
    ),
    impact: { co2eKg: co2, ...(inhaled > 0 ? { inhaledPm25Ug: inhaled } : {}) },
    assumption: L(
      `Emissions at ${K.EF.car} kg CO₂e per km (car) or ${K.EF.bike} (two-wheeler). Exposure counted for two-wheeler riders only, at ${TIME.BIKE_KMH} km/h.`,
      `कार ${K.EF.car} और दोपहिया ${K.EF.bike} किग्रा CO₂e/किमी। एक्सपोज़र केवल दोपहिया सवारों के लिए, ${TIME.BIKE_KMH} किमी/घंटा पर।`,
    ),
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
    priority: 50,
    title: L("Take the metro or a bus instead of driving", "गाड़ी की जगह मेट्रो या बस लें"),
    why: L(
      `Your ${km} km each way by car puts about ${round1(kmDay * K.EF.car)} kg of CO₂ into the air every day. Shared transit brings that to about ${round1(kmDay * K.EF.transit)} kg per person, and takes one more engine off your street.`,
      `आपका हर तरफ़ ${km} किमी का कार सफ़र रोज़ लगभग ${round1(kmDay * K.EF.car)} किग्रा CO₂ छोड़ता है। मेट्रो/बस में यह प्रति व्यक्ति लगभग ${round1(kmDay * K.EF.transit)} किग्रा रह जाता है।`,
    ),
    impact: { co2eKg: kmDay * (K.EF.car - K.EF.transit) },
    assumption: L(
      `Car ${K.EF.car} kg CO₂e per km; metro or bus about ${K.EF.transit} kg per passenger-km. Typical published averages; your vehicle may differ.`,
      `कार ${K.EF.car} किग्रा CO₂e/किमी; मेट्रो या बस लगभग ${K.EF.transit} किग्रा प्रति यात्री-किमी। ये औसत मान हैं।`,
    ),
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
    priority: 42,
    title: L("Share the ride with one more person", "एक और व्यक्ति के साथ कार शेयर करें"),
    why: L(
      "Two people in one car halve the exhaust per person. On days the metro is not an option, this is the next best step.",
      "एक कार में दो लोग होने से प्रति व्यक्ति धुआँ आधा हो जाता है। जिस दिन मेट्रो संभव न हो, यह अगला बेहतर कदम है।",
    ),
    impact: { co2eKg: kmDay * K.EF.car * TRIP.CARPOOL_SHARE },
    assumption: L(
      `${kmDay} km a day at ${K.EF.car} kg CO₂e per km, split across two people.`,
      `रोज़ ${kmDay} किमी, ${K.EF.car} किग्रा CO₂e/किमी, दो लोगों में बँटा हुआ।`,
    ),
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
    priority: c.prot + 22,
    title: L("Wear a fitted N95 or FFP2 mask on your commute", "आने-जाने में फ़िट होने वाला N95 या FFP2 मास्क पहनें"),
    why: L(
      `You are in the open for about ${r0(hoursOut * 60)} minutes a day at rush-hour PM2.5 near ${r0(c.avg.rush)} µg/m³. A cloth or surgical mask barely filters fine particles; a fitted N95 does.`,
      `आप रोज़ लगभग ${r0(hoursOut * 60)} मिनट खुले में रहते हैं, जब PM2.5 लगभग ${r0(c.avg.rush)} µg/m³ होता है। कपड़े या सर्जिकल मास्क महीन कणों को लगभग नहीं रोकते; फ़िट N95 रोकता है।`,
    ),
    impact: { inhaledPm25Ug: avoided },
    assumption: L(
      `Inhaled dose = PM2.5 × breathing volume × time. A well-fitted N95 blocks about ${pct(K.MASK_EFFECT)}% in daily use (lab rating is 95%). Beards and loose straps lower this.`,
      `साँस में गया डोज़ = PM2.5 × साँस की मात्रा × समय। अच्छी तरह फ़िट N95 रोज़मर्रा में लगभग ${pct(K.MASK_EFFECT)}% रोकता है (लैब रेटिंग 95%)।`,
    ),
    forWhom: [WHO.commuter],
  });
};
