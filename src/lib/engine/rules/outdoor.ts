import { AQI, HOURS, K, TIME } from "../constants";
import { L, WHO, outdoorOrIndoors, r0, range, type Rule } from "../rule";

const EARLY = range({ start: HOURS.EARLY[0], end: HOURS.EARLY[HOURS.EARLY.length - 1] + 1 });
const EVENING = range({ start: HOURS.EVENING[0], end: HOURS.EVENING[HOURS.EVENING.length - 1] + 1 });

export const exercise: Rule = (c) => {
  const { outdoor, minutes } = c.p.exercise;
  if (!outdoor || minutes <= 0) return null;
  const vent = K.VENT.moderate;
  return outdoorOrIndoors(c, {
    best: c.bestExercise,
    limit: c.limits.exercise,
    vent,
    hours: minutes / 60,
    usualPm25: c.avg.early,
    window: (best, avoided) => {
      const w = range(best);
      return {
        id: "exercise-window",
        group: "outdoor",
        priority: c.prot + 10,
        title: L(`Exercise outdoors at ${w.en}`, `बाहर कसरत ${w.hi} करें`),
        why: L(
          `The cleanest stretch for a ${minutes}-minute workout today is ${w.en}, AQI about ${best.aqi}. Around dawn, cold still air traps smoke near the ground, so a ${EARLY.en} run often means more exposure, not less.`,
          `आज ${minutes} मिनट की कसरत के लिए सबसे साफ़ समय ${w.hi} है, AQI लगभग ${best.aqi}। सुबह-सुबह ठंडी, ठहरी हवा धुएँ को ज़मीन के पास रोक लेती है।`,
        ),
        impact: { inhaledPm25Ug: avoided },
        assumption: L(
          `Compared with a ${EARLY.en} workout (PM2.5 about ${r0(c.avg.early)} µg/m³) at a hard-exercise breathing rate of ${vent} m³/h for ${minutes} minutes.`,
          `${EARLY.hi} की कसरत (PM2.5 लगभग ${r0(c.avg.early)} µg/m³) की तुलना में, ${minutes} मिनट, ${vent} m³/घंटा साँस की दर पर।`,
        ),
        window: best,
        forWhom: [WHO.exerciser],
      };
    },
    indoors: (out, inside, bestAqi, avoided) => ({
      id: "exercise-indoors",
      group: "outdoor",
      priority: c.prot + 18,
      title: L("Move today's workout indoors", "आज की कसरत घर के अंदर करें"),
      why: L(
        `Even the cleanest hours today sit at AQI ${bestAqi}. When you exercise you breathe about five times the air you do at rest, so you pull in far more PM2.5 per minute. Yoga, skipping or stairs indoors keep the benefit without the dose.`,
        `आज सबसे साफ़ घंटों में भी AQI ${bestAqi} है। कसरत में आप आराम की तुलना में लगभग पाँच गुना हवा लेते हैं, इसलिए PM2.5 कहीं ज़्यादा अंदर जाता है। घर में योग, रस्सी कूद या सीढ़ियाँ अपनाएँ।`,
      ),
      impact: { inhaledPm25Ug: avoided },
      assumption: L(
        `${minutes} minutes at ${vent} m³/h. Outdoor PM2.5 ${r0(out)} µg/m³ versus about ${r0(inside)} µg/m³ indoors with your current windows and purifier setup.`,
        `${minutes} मिनट, ${vent} m³/घंटा। बाहर PM2.5 ${r0(out)} µg/m³ बनाम आपके मौजूदा खिड़की/प्यूरीफ़ायर सेटअप में घर के अंदर लगभग ${r0(inside)} µg/m³।`,
      ),
      forWhom: [WHO.exerciser],
    }),
  });
};

export const kidsPlay: Rule = (c) => {
  if (c.p.household.children < 1 || c.aqi < AQI.PROTECT_FROM) return null;
  const vent = K.VENT.light;
  const mins = r0(TIME.KIDS_PLAY_H * 60);
  return outdoorOrIndoors(c, {
    best: c.bestHour,
    limit: c.limits.vulnerable,
    vent,
    hours: TIME.KIDS_PLAY_H,
    usualPm25: c.avg.evening,
    window: (best, avoided) => {
      const w = range(best);
      return {
        id: "kids-play-window",
        group: "outdoor",
        priority: c.prot + 16,
        title: L(`Let children play outside at ${w.en}, not after school`, `बच्चों को स्कूल के बाद नहीं, ${w.hi} खेलने दें`),
        why: L(
          `Children breathe faster for their size and their lungs are still growing. ${w.en} is today's cleanest hour (AQI about ${best.aqi}); late afternoon and evening are usually worse as traffic builds and the air cools.`,
          `बच्चे अपने आकार के हिसाब से तेज़ साँस लेते हैं और उनके फेफड़े अभी बढ़ रहे हैं। ${w.hi} आज का सबसे साफ़ समय है (AQI लगभग ${best.aqi}); शाम को ट्रैफ़िक और ठंड से हवा आम तौर पर बिगड़ती है।`,
        ),
        impact: { inhaledPm25Ug: avoided },
        assumption: L(
          `${mins} minutes of play at ${vent} m³/h, compared with playing at ${EVENING.en} (PM2.5 about ${r0(c.avg.evening)} µg/m³).`,
          `${mins} मिनट का खेल, ${vent} m³/घंटा, ${EVENING.hi} (PM2.5 लगभग ${r0(c.avg.evening)} µg/m³) की तुलना में।`,
        ),
        window: best,
        forWhom: [WHO.kids],
      };
    },
    indoors: (out, inside, bestAqi, avoided) => ({
      id: "kids-play-indoors",
      group: "outdoor",
      priority: c.prot + 22,
      title: L("Keep children's play indoors today", "आज बच्चों का खेल घर के अंदर रखें"),
      why: L(
        `Even the cleanest hour today is AQI ${bestAqi}. Indoor games, a corridor race or a dance session give the same energy burn with much cleaner air. Check with the school about outdoor sports and assembly.`,
        `आज सबसे साफ़ घंटे में भी AQI ${bestAqi} है। घर में खेल, डांस या दौड़ वही ऊर्जा खर्च कराते हैं और हवा कहीं साफ़ होती है। स्कूल से आउटडोर खेल और असेंबली के बारे में पूछें।`,
      ),
      impact: { inhaledPm25Ug: avoided },
      assumption: L(
        `${mins} minutes at ${vent} m³/h: outdoor PM2.5 ${r0(out)} µg/m³ versus about ${r0(inside)} µg/m³ indoors.`,
        `${mins} मिनट, ${vent} m³/घंटा: बाहर PM2.5 ${r0(out)} µg/m³ बनाम घर के अंदर लगभग ${r0(inside)} µg/m³।`,
      ),
      forWhom: [WHO.kids],
    }),
  });
};

export const eldersWalk: Rule = (c) => {
  if (c.p.household.elders < 1 || c.aqi < AQI.PROTECT_FROM) return null;
  const vent = K.VENT.walk;
  const mins = r0(TIME.ELDER_WALK_H * 60);
  return outdoorOrIndoors(c, {
    best: c.bestHour,
    limit: c.limits.vulnerable,
    vent,
    hours: TIME.ELDER_WALK_H,
    usualPm25: c.avg.early,
    window: (best, avoided) => {
      const w = range(best);
      return {
        id: "elders-walk-window",
        group: "outdoor",
        priority: c.prot + 12,
        title: L(`Move the morning walk to ${w.en}`, `सुबह की सैर ${w.hi} करें`),
        why: L(
          `Older lungs and hearts cope less well with fine particles. The usual dawn walk is often the most polluted hour of a winter day; ${w.en} is cleaner today (AQI about ${best.aqi}). Dress warm, as midday is also the mildest time.`,
          `बुज़ुर्गों के फेफड़े और दिल महीन कणों को कम सह पाते हैं। सर्दियों में सुबह की सैर अक्सर दिन का सबसे प्रदूषित समय होती है; आज ${w.hi} साफ़ है (AQI लगभग ${best.aqi})।`,
        ),
        impact: { inhaledPm25Ug: avoided },
        assumption: L(
          `${mins}-minute walk at ${vent} m³/h compared with a ${EARLY.en} walk (PM2.5 about ${r0(c.avg.early)} µg/m³).`,
          `${mins} मिनट की सैर, ${vent} m³/घंटा, ${EARLY.hi} (PM2.5 लगभग ${r0(c.avg.early)} µg/m³) की तुलना में।`,
        ),
        window: best,
        forWhom: [WHO.elders],
      };
    },
    indoors: (out, inside, bestAqi, avoided) => ({
      id: "elders-walk-indoors",
      group: "outdoor",
      priority: c.prot + 20,
      title: L("Walk indoors today instead of outside", "आज बाहर की जगह घर के अंदर टहलें"),
      why: L(
        `Air is poor at every hour today (best hour AQI ${bestAqi}). Walking up and down a hallway, or light stretching, keeps joints moving without extra particles in the lungs.`,
        `आज हर घंटे हवा खराब है (सबसे अच्छे घंटे में AQI ${bestAqi})। घर में टहलना या हल्की स्ट्रेचिंग फेफड़ों में अतिरिक्त कण डाले बिना शरीर चलाती है।`,
      ),
      impact: { inhaledPm25Ug: avoided },
      assumption: L(
        `${mins} minutes at ${vent} m³/h: outdoor ${r0(out)} µg/m³ versus about ${r0(inside)} µg/m³ indoors.`,
        `${mins} मिनट, ${vent} m³/घंटा: बाहर ${r0(out)} µg/m³ बनाम घर के अंदर लगभग ${r0(inside)} µg/m³।`,
      ),
      forWhom: [WHO.elders],
    }),
  });
};
