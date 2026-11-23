import { categoryFor, INHALED_UG_PER_CIGARETTE, UG_PER_CIGARETTE_DAY, indiaAqi } from "./aqi";
import { hourLabel, type AirSnapshot } from "./airdata";
import type {
  ActionGroup,
  ActionOut,
  Bilingual,
  HourPoint,
  Impact,
  Lang,
  PlanResponse,
  Profile,
} from "./types";

/**
 * Every number the user sees comes from this file, not from the language model.
 * Constants are rounded, published-range values. They are estimates and the UI says so.
 */
export const K = {
  /** breathing volume, m³ of air per hour */
  VENT: { rest: 0.45, sleep: 0.35, light: 1.0, walk: 1.2, moderate: 2.2 },
  /** share of outdoor PM2.5 that reaches indoor air */
  F_OPEN: 0.9,
  F_CLOSED: 0.6,
  /** indoor PM2.5 reduction from a right-sized HEPA purifier, doors and windows closed */
  PURIFIER_CUT: 0.6,
  /** real-world protection of a fitted N95/FFP2 (lab rating is ~95%) */
  MASK_EFFECT: 0.7,
  /** kg CO2e per passenger-km */
  EF: { car: 0.17, bike: 0.04, bus: 0.05, metro: 0.03, transit: 0.04 },
  /** extra indoor PM2.5 (µg/m³) while burning solid fuel; indicative, real values vary widely */
  BIOMASS_HEAT_UG: 150,
  BIOMASS_COOK_UG: 200,
} as const;

const L = (en: string, hi: string): Bilingual => ({ en, hi });
const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => Math.round(n * 10) / 10;

const WHO = {
  everyone: L("Everyone", "सभी"),
  kids: L("Children", "बच्चे"),
  elders: L("Older adults", "बुज़ुर्ग"),
  sensitive: L("Anyone with asthma, heart disease or pregnancy", "दमा, दिल की बीमारी या गर्भावस्था वाले"),
  commuter: L("Commuter", "आने-जाने वाले"),
  exerciser: L("Whoever exercises outdoors", "बाहर कसरत करने वाले"),
  cook: L("Whoever cooks", "खाना बनाने वाले"),
};

interface Win {
  start: number;
  end: number;
  label: string;
  avgPm25: number;
  aqi: number;
}

interface Ctx {
  p: Profile;
  lang: Lang;
  aqi: number;
  pm25: number;
  hours: HourPoint[];
  prot: number; // 0-100 urgency of protective actions
  sensitiveFlag: boolean;
  exLimit: number;
  vulnLimit: number;
  bestEx: Win | null;
  best1: Win | null;
  earlyAvg: number;
  eveningAvg: number;
  rushAvg: number;
  nightAvg: number;
  avg24: number;
  indoor: (outdoor: number) => number;
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function avgFor(hours: HourPoint[], hs: number[], fallback: number): number {
  const vals = hours.filter((h) => hs.includes(h.hour)).map((h) => h.pm25);
  return vals.length ? mean(vals) : fallback;
}

/** Cleanest run of `len` consecutive daytime hours (06:00 to 20:00). */
export function bestWindow(hours: HourPoint[], len: number): Win | null {
  let best: Win | null = null;
  for (let i = 0; i + len <= hours.length; i++) {
    const slice = hours.slice(i, i + len);
    const consecutive = slice.every((h, j) => h.hour === (slice[0].hour + j) % 24);
    const daytime = slice[0].hour >= 6 && slice[len - 1].hour <= 19;
    if (!consecutive || !daytime) continue;
    const avgPm25 = mean(slice.map((h) => h.pm25));
    const avgPm10 = mean(slice.map((h) => h.pm10));
    if (!best || avgPm25 < best.avgPm25) {
      const start = slice[0].hour;
      const end = (start + len) % 24;
      best = {
        start,
        end,
        label: `${hourLabel(start)}–${hourLabel(end)}`,
        avgPm25,
        aqi: indiaAqi(avgPm25, avgPm10),
      };
    }
  }
  return best;
}

function worstStretch(hours: HourPoint[], limit: number): PlanResponse["avoid"] {
  const maxAqi = Math.max(...hours.map((h) => h.aqi));
  if (maxAqi <= limit) return null;
  const threshold = Math.max(limit, 0.85 * maxAqi);
  let bestRun: [number, number] | null = null;
  let runStart = -1;
  for (let i = 0; i <= hours.length; i++) {
    const hit = i < hours.length && hours[i].aqi >= threshold;
    if (hit && runStart < 0) runStart = i;
    if (!hit && runStart >= 0) {
      if (!bestRun || i - runStart > bestRun[1] - bestRun[0]) bestRun = [runStart, i];
      runStart = -1;
    }
  }
  if (!bestRun) return null;
  const [a, b] = bestRun;
  return {
    start: hours[a].label,
    end: hourLabel((hours[b - 1].hour + 1) % 24),
    allDay: b - a >= 22,
  };
}

function mk(
  ctx: Ctx,
  o: {
    id: string;
    group: ActionGroup;
    exclusive?: string;
    priority: number;
    title: Bilingual;
    why: Bilingual;
    impact?: Impact;
    assumption?: Bilingual;
    window?: string;
    forWhom: Bilingual[];
  },
): ActionOut {
  const lang = ctx.lang;
  return {
    id: o.id,
    group: o.group,
    exclusive: o.exclusive,
    priority: Math.round(Math.min(100, o.priority)),
    title: o.title[lang],
    why: o.why[lang],
    impact: o.impact ?? {},
    assumption: o.assumption ? o.assumption[lang] : "",
    window: o.window,
    forWhom: o.forWhom.map((w) => w[lang]),
  };
}

// ---------------------------------------------------------------- actions

function carToTransit(c: Ctx): ActionOut | null {
  const { mode, km } = c.p.commute;
  if (mode !== "car" || km < 2) return null;
  const kmDay = km * 2;
  const saved = kmDay * (K.EF.car - K.EF.transit);
  return mk(c, {
    id: "car-to-transit",
    group: "move",
    exclusive: "commute",
    priority: 50,
    title: L("Take the metro or a bus instead of driving", "गाड़ी की जगह मेट्रो या बस लें"),
    why: L(
      `Your ${km} km each way by car puts about ${r1(kmDay * K.EF.car)} kg of CO₂ into the air every day. Shared transit brings that to about ${r1(kmDay * K.EF.transit)} kg per person, and takes one more engine off your street.`,
      `आपका हर तरफ़ ${km} किमी का कार सफ़र रोज़ लगभग ${r1(kmDay * K.EF.car)} किग्रा CO₂ छोड़ता है। मेट्रो/बस में यह प्रति व्यक्ति लगभग ${r1(kmDay * K.EF.transit)} किग्रा रह जाता है।`,
    ),
    impact: { co2eKg: saved },
    assumption: L(
      "Car 0.17 kg CO₂e per km; metro or bus about 0.04 kg per passenger-km. Typical published averages; your vehicle may differ.",
      "कार 0.17 किग्रा CO₂e/किमी; मेट्रो या बस लगभग 0.04 किग्रा प्रति यात्री-किमी। ये औसत मान हैं।",
    ),
    forWhom: [WHO.commuter],
  });
}

function carpool(c: Ctx): ActionOut | null {
  const { mode, km } = c.p.commute;
  if (mode !== "car" || km < 2) return null;
  const saved = km * 2 * K.EF.car * 0.5;
  return mk(c, {
    id: "carpool",
    group: "move",
    exclusive: "commute",
    priority: 42,
    title: L("Share the ride with one more person", "एक और व्यक्ति के साथ कार शेयर करें"),
    why: L(
      "Two people in one car halve the exhaust per person. On days the metro is not an option, this is the next best step.",
      "एक कार में दो लोग होने से प्रति व्यक्ति धुआँ आधा हो जाता है। जिस दिन मेट्रो संभव न हो, यह अगला बेहतर कदम है।",
    ),
    impact: { co2eKg: saved },
    assumption: L(
      `${km * 2} km a day at 0.17 kg CO₂e per km, split across two people.`,
      `रोज़ ${km * 2} किमी, 0.17 किग्रा CO₂e/किमी, दो लोगों में बँटा हुआ।`,
    ),
    forWhom: [WHO.commuter],
  });
}

function commuteMask(c: Ctx): ActionOut | null {
  const { mode, km } = c.p.commute;
  if (!(mode === "bike" || mode === "walk" || mode === "bus") || c.aqi < 150) return null;
  const hoursOut = mode === "bike" ? (2 * km) / 25 : mode === "walk" ? Math.min((2 * km) / 5, 2) : 0.67;
  const vent = mode === "bike" ? K.VENT.light : K.VENT.walk;
  const dose = c.rushAvg * vent * hoursOut;
  const avoided = dose * K.MASK_EFFECT;
  if (avoided < 5) return null;
  return mk(c, {
    id: "commute-mask",
    group: "move",
    exclusive: "commute",
    priority: c.prot + 22,
    title: L("Wear a fitted N95 or FFP2 mask on your commute", "आने-जाने में फ़िट होने वाला N95 या FFP2 मास्क पहनें"),
    why: L(
      `You are in the open for about ${r0(hoursOut * 60)} minutes a day at rush-hour PM2.5 near ${r0(c.rushAvg)} µg/m³. A cloth or surgical mask barely filters fine particles; a fitted N95 does.`,
      `आप रोज़ लगभग ${r0(hoursOut * 60)} मिनट खुले में रहते हैं, जब PM2.5 लगभग ${r0(c.rushAvg)} µg/m³ होता है। कपड़े या सर्जिकल मास्क महीन कणों को लगभग नहीं रोकते; फ़िट N95 रोकता है।`,
    ),
    impact: { inhaledPm25Ug: avoided },
    assumption: L(
      `Inhaled dose = PM2.5 × breathing volume × time. A well-fitted N95 blocks about ${r0(K.MASK_EFFECT * 100)}% in daily use (lab rating is 95%). Beards and loose straps lower this.`,
      `साँस में गया डोज़ = PM2.5 × साँस की मात्रा × समय। अच्छी तरह फ़िट N95 रोज़मर्रा में लगभग ${r0(K.MASK_EFFECT * 100)}% रोकता है (लैब रेटिंग 95%)।`,
    ),
    forWhom: [WHO.commuter],
  });
}

function wfhSevere(c: Ctx): ActionOut | null {
  const { mode, km } = c.p.commute;
  if (!(mode === "car" || mode === "bike") || km < 1 || c.aqi < 300) return null;
  const kmDay = km * 2;
  const co2 = kmDay * K.EF[mode];
  const inhaled = mode === "bike" ? c.rushAvg * K.VENT.light * (kmDay / 25) : 0;
  return mk(c, {
    id: "wfh-severe",
    group: "move",
    exclusive: "commute",
    priority: 78,
    title: L("Work from home today if you can", "हो सके तो आज घर से काम करें"),
    why: L(
      `AQI is ${c.aqi} today. Skipping the ${kmDay} km round trip avoids both your own exposure in traffic and about ${r1(co2)} kg of CO₂.`,
      `आज AQI ${c.aqi} है। ${kmDay} किमी का आना-जाना बचाने से ट्रैफ़िक में आपका एक्सपोज़र और लगभग ${r1(co2)} किग्रा CO₂ दोनों बचते हैं।`,
    ),
    impact: { co2eKg: co2, ...(inhaled > 0 ? { inhaledPm25Ug: inhaled } : {}) },
    assumption: L(
      "Emissions at 0.17 kg CO₂e per km (car) or 0.04 (two-wheeler). Exposure counted for two-wheeler riders only, at 25 km/h.",
      "कार 0.17 और दोपहिया 0.04 किग्रा CO₂e/किमी। एक्सपोज़र केवल दोपहिया सवारों के लिए, 25 किमी/घंटा पर।",
    ),
    forWhom: [WHO.commuter],
  });
}

function exercise(c: Ctx): ActionOut | null {
  const { outdoor, minutes } = c.p.exercise;
  if (!outdoor || minutes <= 0) return null;
  const h = minutes / 60;
  const best = c.bestEx;
  if (best && best.aqi <= c.exLimit) {
    const avoided = Math.max(0, (c.earlyAvg - best.avgPm25) * K.VENT.moderate * h);
    return mk(c, {
      id: "exercise-window",
      group: "outdoor",
      priority: c.prot + 10,
      title: L(`Exercise outdoors at ${best.label}`, `बाहर कसरत ${best.label} के बीच करें`),
      why: L(
        `The cleanest stretch for a ${minutes}-minute workout today is ${best.label}, AQI about ${best.aqi}. Around dawn, cold still air traps smoke near the ground, so a 6–8 am run often means more exposure, not less.`,
        `आज ${minutes} मिनट की कसरत के लिए सबसे साफ़ समय ${best.label} है, AQI लगभग ${best.aqi}। सुबह-सुबह ठंडी, ठहरी हवा धुएँ को ज़मीन के पास रोक लेती है।`,
      ),
      impact: { inhaledPm25Ug: avoided },
      assumption: L(
        `Compared with a 6–8 am workout (PM2.5 about ${r0(c.earlyAvg)} µg/m³) at a hard-exercise breathing rate of ${K.VENT.moderate} m³/h for ${minutes} minutes.`,
        `सुबह 6–8 बजे की कसरत (PM2.5 लगभग ${r0(c.earlyAvg)} µg/m³) की तुलना में, ${minutes} मिनट, ${K.VENT.moderate} m³/घंटा साँस की दर पर।`,
      ),
      window: best.label,
      forWhom: [WHO.exerciser],
    });
  }
  const outAtBest = best ? best.avgPm25 : c.pm25;
  const inside = c.indoor(outAtBest);
  const avoided = Math.max(0, (outAtBest - inside) * K.VENT.moderate * h);
  return mk(c, {
    id: "exercise-indoors",
    group: "outdoor",
    priority: c.prot + 18,
    title: L("Move today's workout indoors", "आज की कसरत घर के अंदर करें"),
    why: L(
      `Even the cleanest hours today sit at AQI ${best ? best.aqi : c.aqi}. When you exercise you breathe about five times the air you do at rest, so you pull in far more PM2.5 per minute. Yoga, skipping or stairs indoors keep the benefit without the dose.`,
      `आज सबसे साफ़ घंटों में भी AQI ${best ? best.aqi : c.aqi} है। कसरत में आप आराम की तुलना में लगभग पाँच गुना हवा लेते हैं, इसलिए PM2.5 कहीं ज़्यादा अंदर जाता है। घर में योग, रस्सी कूद या सीढ़ियाँ अपनाएँ।`,
    ),
    impact: { inhaledPm25Ug: avoided },
    assumption: L(
      `${minutes} minutes at ${K.VENT.moderate} m³/h. Outdoor PM2.5 ${r0(outAtBest)} µg/m³ versus about ${r0(inside)} µg/m³ indoors with your current windows and purifier setup.`,
      `${minutes} मिनट, ${K.VENT.moderate} m³/घंटा। बाहर PM2.5 ${r0(outAtBest)} µg/m³ बनाम आपके मौजूदा खिड़की/प्यूरीफ़ायर सेटअप में घर के अंदर लगभग ${r0(inside)} µg/m³।`,
    ),
    forWhom: [WHO.exerciser],
  });
}

function kidsPlay(c: Ctx): ActionOut | null {
  if (c.p.household.children < 1 || c.aqi < 100) return null;
  const best = c.best1;
  if (best && best.aqi <= c.vulnLimit) {
    const avoided = Math.max(0, (c.eveningAvg - best.avgPm25) * K.VENT.light * 1);
    return mk(c, {
      id: "kids-play-window",
      group: "outdoor",
      priority: c.prot + 16,
      title: L(`Let children play outside at ${best.label}, not after school`, `बच्चों को स्कूल के बाद नहीं, ${best.label} के बीच खेलने दें`),
      why: L(
        `Children breathe faster for their size and their lungs are still growing. ${best.label} is today's cleanest hour (AQI about ${best.aqi}); late afternoon and evening are usually worse as traffic builds and the air cools.`,
        `बच्चे अपने आकार के हिसाब से तेज़ साँस लेते हैं और उनके फेफड़े अभी बढ़ रहे हैं। ${best.label} आज का सबसे साफ़ समय है (AQI लगभग ${best.aqi}); शाम को ट्रैफ़िक और ठंड से हवा आम तौर पर बिगड़ती है।`,
      ),
      impact: { inhaledPm25Ug: avoided },
      assumption: L(
        `One hour of play at ${K.VENT.light} m³/h, compared with a 5–7 pm session (PM2.5 about ${r0(c.eveningAvg)} µg/m³).`,
        `एक घंटे का खेल, ${K.VENT.light} m³/घंटा, शाम 5–7 बजे (PM2.5 लगभग ${r0(c.eveningAvg)} µg/m³) की तुलना में।`,
      ),
      window: best.label,
      forWhom: [WHO.kids],
    });
  }
  const outAtBest = best ? best.avgPm25 : c.pm25;
  const inside = c.indoor(outAtBest);
  return mk(c, {
    id: "kids-play-indoors",
    group: "outdoor",
    priority: c.prot + 22,
    title: L("Keep children's play indoors today", "आज बच्चों का खेल घर के अंदर रखें"),
    why: L(
      `Even the cleanest hour today is AQI ${best ? best.aqi : c.aqi}. Indoor games, a corridor race or a dance session give the same energy burn with much cleaner air. Check with the school about outdoor sports and assembly.`,
      `आज सबसे साफ़ घंटे में भी AQI ${best ? best.aqi : c.aqi} है। घर में खेल, डांस या दौड़ वही ऊर्जा खर्च कराते हैं और हवा कहीं साफ़ होती है। स्कूल से आउटडोर खेल और असेंबली के बारे में पूछें।`,
    ),
    impact: { inhaledPm25Ug: Math.max(0, (outAtBest - inside) * K.VENT.light) },
    assumption: L(
      `One hour at ${K.VENT.light} m³/h: outdoor PM2.5 ${r0(outAtBest)} µg/m³ versus about ${r0(inside)} µg/m³ indoors.`,
      `एक घंटा, ${K.VENT.light} m³/घंटा: बाहर PM2.5 ${r0(outAtBest)} µg/m³ बनाम घर के अंदर लगभग ${r0(inside)} µg/m³।`,
    ),
    forWhom: [WHO.kids],
  });
}

function eldersWalk(c: Ctx): ActionOut | null {
  if (c.p.household.elders < 1 || c.aqi < 100) return null;
  const best = c.best1;
  if (best && best.aqi <= c.vulnLimit) {
    const avoided = Math.max(0, (c.earlyAvg - best.avgPm25) * K.VENT.walk * 0.75);
    return mk(c, {
      id: "elders-walk-window",
      group: "outdoor",
      priority: c.prot + 12,
      title: L(`Move the morning walk to ${best.label}`, `सुबह की सैर ${best.label} के बीच करें`),
      why: L(
        `Older lungs and hearts cope less well with fine particles. The usual dawn walk is often the most polluted hour of a winter day; ${best.label} is cleaner today (AQI about ${best.aqi}). Dress warm, as midday is also the mildest time.`,
        `बुज़ुर्गों के फेफड़े और दिल महीन कणों को कम सह पाते हैं। सर्दियों में सुबह की सैर अक्सर दिन का सबसे प्रदूषित समय होती है; आज ${best.label} साफ़ है (AQI लगभग ${best.aqi})।`,
      ),
      impact: { inhaledPm25Ug: avoided },
      assumption: L(
        `45-minute walk at ${K.VENT.walk} m³/h compared with a 6–8 am walk (PM2.5 about ${r0(c.earlyAvg)} µg/m³).`,
        `45 मिनट की सैर, ${K.VENT.walk} m³/घंटा, सुबह 6–8 बजे (PM2.5 लगभग ${r0(c.earlyAvg)} µg/m³) की तुलना में।`,
      ),
      window: best.label,
      forWhom: [WHO.elders],
    });
  }
  const outAtBest = best ? best.avgPm25 : c.pm25;
  const inside = c.indoor(outAtBest);
  return mk(c, {
    id: "elders-walk-indoors",
    group: "outdoor",
    priority: c.prot + 20,
    title: L("Walk indoors today instead of outside", "आज बाहर की जगह घर के अंदर टहलें"),
    why: L(
      `Air is poor at every hour today (best hour AQI ${best ? best.aqi : c.aqi}). Walking up and down a hallway, or light stretching, keeps joints moving without extra particles in the lungs.`,
      `आज हर घंटे हवा खराब है (सबसे अच्छे घंटे में AQI ${best ? best.aqi : c.aqi})। घर में टहलना या हल्की स्ट्रेचिंग फेफड़ों में अतिरिक्त कण डाले बिना शरीर चलाती है।`,
    ),
    impact: { inhaledPm25Ug: Math.max(0, (outAtBest - inside) * K.VENT.walk * 0.75) },
    assumption: L(
      `45 minutes at ${K.VENT.walk} m³/h: outdoor ${r0(outAtBest)} µg/m³ versus about ${r0(inside)} µg/m³ indoors.`,
      `45 मिनट, ${K.VENT.walk} m³/घंटा: बाहर ${r0(outAtBest)} µg/m³ बनाम घर के अंदर लगभग ${r0(inside)} µg/m³।`,
    ),
    forWhom: [WHO.elders],
  });
}

function purifier(c: Ctx): ActionOut | null {
  if (c.aqi < 100) return null;
  const f = c.p.windows === "open" ? K.F_OPEN : K.F_CLOSED;
  const before = c.nightAvg * f;
  const after = before * (1 - K.PURIFIER_CUT);
  const avoided = (before - after) * K.VENT.sleep * 8;
  const has = c.p.hasPurifier;
  return mk(c, {
    id: "bedroom-purifier",
    group: "indoor",
    priority: c.prot + 14,
    title: has
      ? L("Run your purifier in the bedroom all night, door shut", "प्यूरीफ़ायर को पूरी रात बेडरूम में, दरवाज़ा बंद करके चलाएँ")
      : L("Set up one HEPA purifier in the bedroom", "बेडरूम में एक HEPA प्यूरीफ़ायर लगाएँ"),
    why: has
      ? L(
          "You spend about a third of your life asleep in one room, so that is the best place for the machine. Keep the door and windows closed, choose auto mode, and clean the pre-filter every two weeks.",
          "आप अपना लगभग एक-तिहाई जीवन एक कमरे में सोते हुए बिताते हैं, इसलिए मशीन के लिए यही सबसे अच्छी जगह है। दरवाज़ा-खिड़कियाँ बंद रखें, ऑटो मोड चुनें और प्री-फ़िल्टर हर दो हफ़्ते में साफ़ करें।",
        )
      : L(
          `You spend about a third of your life asleep in one room, so one purifier there does the most good. No budget? Tape four MERV-13 furnace filters around a box fan (a Corsi–Rosenthal box); tests show it cleans a room about as well as a mid-range purifier.`,
          "आप अपना लगभग एक-तिहाई जीवन एक कमरे में सोकर बिताते हैं, इसलिए वहाँ एक प्यूरीफ़ायर सबसे ज़्यादा फ़ायदा देता है। बजट कम है? बॉक्स फ़ैन के चारों ओर चार MERV-13 फ़िल्टर लगाएँ (कॉर्सी–रोज़ेंथल बॉक्स); यह औसत प्यूरीफ़ायर जितना कमरा साफ़ करता है।",
        ),
    impact: { inhaledPm25Ug: avoided },
    assumption: L(
      `A right-sized HEPA purifier cuts indoor PM2.5 by about ${r0(K.PURIFIER_CUT * 100)}% with doors and windows closed. Eight hours of sleep at ${K.VENT.sleep} m³/h; night-time outdoor PM2.5 about ${r0(c.nightAvg)} µg/m³.`,
      `सही आकार का HEPA प्यूरीफ़ायर बंद दरवाज़े-खिड़कियों में अंदर के PM2.5 को लगभग ${r0(K.PURIFIER_CUT * 100)}% घटाता है। आठ घंटे की नींद, ${K.VENT.sleep} m³/घंटा; रात का बाहरी PM2.5 लगभग ${r0(c.nightAvg)} µg/m³।`,
    ),
    forWhom: [WHO.everyone],
  });
}

function smartVentilation(c: Ctx): ActionOut | null {
  if (c.p.windows !== "open" || c.aqi < 100) return null;
  const saved = c.avg24 * (K.F_OPEN - K.F_CLOSED) * K.VENT.rest * 14;
  const w = c.best1;
  return mk(c, {
    id: "smart-ventilation",
    group: "indoor",
    priority: c.prot + 8,
    title: w
      ? L(`Keep windows shut, and air the house for 10 minutes at ${w.label}`, `खिड़कियाँ बंद रखें, और ${w.label} के बीच 10 मिनट घर में हवा आने दें`)
      : L("Keep windows shut and air the house briefly", "खिड़कियाँ बंद रखें और थोड़ी देर के लिए हवा आने दें"),
    why: L(
      "Open windows let most of the outdoor smoke straight in. Sealing gaps with draught strips and airing once, in the cleanest hour, keeps stale indoor air from building up without inviting the worst of the smog.",
      "खुली खिड़कियाँ बाहर का ज़्यादातर धुआँ सीधे अंदर आने देती हैं। दरारें बंद करके और सबसे साफ़ घंटे में एक बार हवा देने से बासी हवा भी नहीं जमती और खराब हवा भी कम आती है।",
    ),
    impact: { inhaledPm25Ug: saved },
    assumption: L(
      `Indoor PM2.5 is about ${r0(K.F_OPEN * 100)}% of outdoor with windows open and ${r0(K.F_CLOSED * 100)}% when mostly closed. Fourteen hours at home at ${K.VENT.rest} m³/h; 24-hour outdoor PM2.5 about ${r0(c.avg24)} µg/m³.`,
      `खिड़कियाँ खुली होने पर अंदर का PM2.5 बाहर का लगभग ${r0(K.F_OPEN * 100)}% और ज़्यादातर बंद होने पर ${r0(K.F_CLOSED * 100)}%। घर पर चौदह घंटे, ${K.VENT.rest} m³/घंटा; 24 घंटे का बाहरी PM2.5 लगभग ${r0(c.avg24)} µg/m³।`,
    ),
    window: w?.label,
    forWhom: [WHO.everyone],
  });
}

function airOutWhenClean(c: Ctx): ActionOut | null {
  if (c.aqi >= 100) return null;
  return mk(c, {
    id: "air-out",
    group: "indoor",
    priority: 50,
    title: L("The air is fine right now: open the windows for 30 minutes", "अभी हवा ठीक है: 30 मिनट खिड़कियाँ खोलें"),
    why: L(
      "Clean outdoor air dilutes the cooking fumes, dust and carbon dioxide that collect inside. Do it now, before the evening haze settles.",
      "साफ़ बाहरी हवा घर में जमा खाना पकाने के धुएँ, धूल और कार्बन डाइऑक्साइड को हल्का करती है। शाम की धुंध से पहले अभी कर लें।",
    ),
    forWhom: [WHO.everyone],
  });
}

function indoorBurning(c: Ctx): ActionOut | null {
  if (c.p.heating !== "biomass") return null;
  const avoided = K.BIOMASS_HEAT_UG * K.VENT.rest * 4;
  return mk(c, {
    id: "stop-indoor-burning",
    group: "kitchen",
    priority: 82,
    title: L("Swap the wood or coal fire for layers and an electric heater", "लकड़ी या कोयले की अँगीठी की जगह गर्म कपड़े और इलेक्ट्रिक हीटर लें"),
    why: L(
      "A wood or coal fire in a closed room fills it with fine smoke and carbon monoxide, and it pours more into the neighbourhood air at night. A low-wattage oil-filled heater, a hot-water bottle, and warm layers do the job without the smoke.",
      "बंद कमरे में लकड़ी या कोयले की आग महीन धुआँ और कार्बन मोनोऑक्साइड भर देती है, और रात में आस-पड़ोस की हवा भी बिगाड़ती है। कम वॉट का ऑयल हीटर, गर्म पानी की बोतल और गर्म कपड़े बिना धुएँ के काम करते हैं।",
    ),
    impact: { inhaledPm25Ug: avoided },
    assumption: L(
      `Indicative only: assumes the fire adds about ${K.BIOMASS_HEAT_UG} µg/m³ indoors for four hours. Measured values vary widely with fuel, room size and ventilation.`,
      `केवल अनुमान: मानकर चला है कि आग चार घंटे घर में लगभग ${K.BIOMASS_HEAT_UG} µg/m³ जोड़ती है। असली मान ईंधन, कमरे और हवा-आवाजाही के साथ काफ़ी बदलते हैं।`,
    ),
    forWhom: [WHO.everyone],
  });
}

function cookingFuel(c: Ctx): ActionOut | null {
  if (c.p.cooking !== "biomass") return null;
  const avoided = K.BIOMASS_COOK_UG * 0.9 * 2;
  return mk(c, {
    id: "clean-cooking",
    group: "kitchen",
    priority: 86,
    title: L("Move cooking to LPG, PNG or induction", "खाना LPG, PNG या इंडक्शन पर बनाएँ"),
    why: L(
      "Cooking on wood, dung or crop waste is one of the biggest sources of indoor fine particles, and the person cooking breathes the most of it. If cost is the barrier, check eligibility for the government's PM Ujjwala LPG connection.",
      "लकड़ी, उपले या फ़सल के कचरे पर खाना पकाना घर के अंदर महीन कणों का सबसे बड़ा स्रोत है, और पकाने वाला सबसे ज़्यादा साँस लेता है। खर्च बाधा हो तो प्रधानमंत्री उज्ज्वला योजना के LPG कनेक्शन की पात्रता देखें।",
    ),
    impact: { inhaledPm25Ug: avoided },
    assumption: L(
      `Indicative only: assumes a biomass stove adds about ${K.BIOMASS_COOK_UG} µg/m³ in the kitchen for two hours, breathed at ${0.9} m³/h while cooking.`,
      `केवल अनुमान: मानकर चला है कि चूल्हा रसोई में दो घंटे लगभग ${K.BIOMASS_COOK_UG} µg/m³ जोड़ता है, खाना पकाते समय 0.9 m³/घंटा साँस पर।`,
    ),
    forWhom: [WHO.cook],
  });
}

function kitchenExhaust(c: Ctx): ActionOut | null {
  if (c.p.cooking !== "lpg" && c.p.cooking !== "png") return null;
  return mk(c, {
    id: "kitchen-exhaust",
    group: "kitchen",
    priority: 36,
    title: L("Cook with the chimney or exhaust fan on", "खाना बनाते समय चिमनी या एग्ज़ॉस्ट फ़ैन चलाएँ"),
    why: L(
      "Gas burners release fine particles and nitrogen dioxide into the kitchen, and frying adds more. An exhaust fan removes them at the source. No fan? Open the kitchen window a hand's width and shut the door to the rest of the house.",
      "गैस बर्नर रसोई में महीन कण और नाइट्रोजन डाइऑक्साइड छोड़ते हैं, और तलने से और बढ़ते हैं। एग्ज़ॉस्ट फ़ैन इन्हें स्रोत पर ही निकाल देता है। फ़ैन नहीं है? रसोई की खिड़की थोड़ी खोलें और बाकी घर का दरवाज़ा बंद रखें।",
    ),
    forWhom: [WHO.cook],
  });
}

function sensitivePlan(c: Ctx): ActionOut | null {
  if (!c.sensitiveFlag || c.aqi < 100) return null;
  return mk(c, {
    id: "sensitive-plan",
    group: "health",
    priority: c.prot + 32,
    title: L("Keep medicines and your doctor's action plan within reach", "दवाइयाँ और डॉक्टर की एक्शन प्लान हाथ के पास रखें"),
    why: L(
      "Smog days are when asthma, COPD and heart conditions flare. Keep the reliever inhaler and regular medicines stocked, avoid hard effort outdoors, and know the warning signs: breathlessness, wheeze, chest tightness or unusual tiredness. If they appear and do not settle with your usual medicine, contact your doctor or an emergency service.",
      "स्मॉग के दिनों में दमा, COPD और दिल की बीमारियाँ बढ़ जाती हैं। रिलीवर इन्हेलर और नियमित दवाइयाँ पर्याप्त रखें, बाहर भारी मेहनत से बचें और चेतावनी के संकेत पहचानें: साँस फूलना, घरघराहट, सीने में जकड़न या असामान्य थकान। ये दिखें और आपकी दवा से न थमें तो डॉक्टर या आपातकालीन सेवा से संपर्क करें।",
    ),
    forWhom: [WHO.sensitive],
  });
}

function wasteBurning(c: Ctx): ActionOut | null {
  if (c.aqi < 150) return null;
  return mk(c, {
    id: "no-open-burning",
    group: "community",
    priority: 30,
    title: L("Do not burn leaves or rubbish, and tell your society to stop it", "पत्ते या कचरा न जलाएँ, और अपनी सोसायटी में भी रुकवाएँ"),
    why: L(
      "Small fires of leaves, plastic and trash smoulder for hours and release fine particles and toxic fumes right where people live. Ask your RWA, school or guards to arrange waste collection instead, and report open burning through your city helpline or the CPCB Sameer app.",
      "पत्तों, प्लास्टिक और कचरे की छोटी आग घंटों सुलगती है और ठीक वहीं महीन कण और ज़हरीला धुआँ छोड़ती है जहाँ लोग रहते हैं। RWA, स्कूल या गार्ड से कचरा उठवाने को कहें और खुले में जलाने की शिकायत शहर की हेल्पलाइन या CPCB के समीर ऐप पर करें।",
    ),
    forWhom: [WHO.everyone],
  });
}

// ---------------------------------------------------------------- plan

export function buildContext(p: Profile, air: AirSnapshot): Ctx {
  const hours = air.hours;
  const cur = air.current;
  const hh = p.household;
  const sensitiveFlag = hh.respiratory || hh.heart || hh.pregnant;
  const avg24 = mean(hours.map((h) => h.pm25));
  const exLen = Math.min(3, Math.max(1, Math.ceil(p.exercise.minutes / 60)));
  const f = p.windows === "open" ? K.F_OPEN : K.F_CLOSED;
  return {
    p,
    lang: p.lang,
    aqi: cur.aqi,
    pm25: cur.pm25,
    hours,
    prot: Math.min(100, cur.aqi / 4),
    sensitiveFlag,
    exLimit: sensitiveFlag ? 100 : 200,
    vulnLimit: sensitiveFlag ? 100 : 150,
    bestEx: bestWindow(hours, exLen),
    best1: bestWindow(hours, 1),
    earlyAvg: avgFor(hours, [6, 7, 8], avg24),
    eveningAvg: avgFor(hours, [17, 18, 19], avg24),
    rushAvg: avgFor(hours, [8, 9, 10, 17, 18, 19], avg24),
    nightAvg: avgFor(hours, [22, 23, 0, 1, 2, 3, 4, 5], avg24),
    avg24,
    indoor: (out) => out * f * (p.hasPurifier ? 1 - K.PURIFIER_CUT : 1),
  };
}

export function planActions(c: Ctx): ActionOut[] {
  const all = [
    wfhSevere(c),
    carToTransit(c),
    carpool(c),
    commuteMask(c),
    exercise(c),
    kidsPlay(c),
    eldersWalk(c),
    purifier(c),
    smartVentilation(c),
    airOutWhenClean(c),
    indoorBurning(c),
    cookingFuel(c),
    kitchenExhaust(c),
    sensitivePlan(c),
    wasteBurning(c),
  ].filter((a): a is ActionOut => a !== null);
  return all.sort((a, b) => b.priority - a.priority);
}

export function totalsFor(actions: ActionOut[]): PlanResponse["totals"] {
  const seen = new Set<string>();
  let inhaled = 0;
  let co2 = 0;
  for (const a of actions) {
    // actions are sorted by priority, so the first one in an exclusive group is the one we recommend
    if (a.exclusive) {
      if (seen.has(a.exclusive)) continue;
      seen.add(a.exclusive);
    }
    inhaled += a.impact.inhaledPm25Ug ?? 0;
    co2 += a.impact.co2eKg ?? 0;
  }
  return {
    inhaledPm25Ug: r0(inhaled),
    co2eKg: r1(co2),
    cigaretteEq: Math.round((inhaled / INHALED_UG_PER_CIGARETTE) * 10) / 10,
  };
}

export function ruleSummary(
  place: string,
  lang: Lang,
  aqi: number,
  best: PlanResponse["bestWindow"],
  top?: ActionOut,
): { headline: string; summary: string; familyTips: string[] } {
  const cat = categoryFor(aqi).label;
  const headline =
    lang === "hi"
      ? `${place} में हवा ${cat.hi} है (AQI ${aqi})। आज की आपकी योजना।`
      : `Air in ${place} is ${cat.en.toLowerCase()} (AQI ${aqi}). Here is your plan for today.`;
  const parts: string[] = [];
  if (best) {
    parts.push(
      lang === "hi"
        ? `सबसे साफ़ समय ${best.start}–${best.end} (AQI लगभग ${best.aqi})।`
        : `Cleanest hours: ${best.start}–${best.end} (AQI about ${best.aqi}).`,
    );
  }
  if (top) {
    parts.push(lang === "hi" ? `सबसे पहले: ${top.title}।` : `Start with: ${top.title}.`);
  }
  return {
    headline,
    summary: parts.join(" "),
    familyTips: [],
  };
}

/** Pure and deterministic: same inputs, same plan. The AI layer (ai.ts) is added on top by the route. */
export function buildPlan(p: Profile, air: AirSnapshot): PlanResponse {
  const c = buildContext(p, air);
  const actions = planActions(c);
  const best = c.best1
    ? { start: hourLabel(c.best1.start), end: hourLabel(c.best1.end), aqi: c.best1.aqi }
    : null;
  const limit = c.sensitiveFlag ? 100 : 150;
  const avg24 = c.avg24;
  const cur = air.current;
  return {
    place: p.place,
    lang: p.lang,
    fetchedAt: air.fetchedAt,
    source: air.source,
    aqi: { value: cur.aqi, category: cur.category, pm25: cur.pm25, pm10: cur.pm10 },
    cigarettes: Math.round((avg24 / UG_PER_CIGARETTE_DAY) * 10) / 10,
    hours: air.hours,
    bestWindow: best,
    avoid: worstStretch(air.hours, limit),
    actions,
    totals: totalsFor(actions),
    ai: { source: "rules", ...ruleSummary(p.place, p.lang, cur.aqi, best, actions[0]) },
  };
}
