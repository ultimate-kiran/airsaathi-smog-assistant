import { AQI, K, TIME } from "../constants";
import { COPY, WHO } from "../copy";
import { outdoorOrIndoors, type Rule } from "../rule";

export const exercise: Rule = (c) => {
  const { outdoor, minutes } = c.p.exercise;
  if (!outdoor || minutes <= 0) return null;
  return outdoorOrIndoors(c, {
    best: c.bestExercise,
    limit: c.limits.exercise,
    vent: K.VENT.moderate,
    hours: minutes / 60,
    usualPm25: c.avg.early,
    window: (best, avoided) => ({
      id: "exercise-window",
      group: "outdoor",
      text: COPY["exercise-window"]({ minutes, window: best, aqi: best.aqi, earlyPm25: c.avg.early }),
      impact: { inhaledPm25Ug: avoided },
      window: best,
      forWhom: [WHO.exerciser],
    }),
    indoors: (cmp, avoided) => ({
      id: "exercise-indoors",
      group: "outdoor",
      text: COPY["exercise-indoors"]({ ...cmp, minutes }),
      impact: { inhaledPm25Ug: avoided },
      forWhom: [WHO.exerciser],
    }),
  });
};

export const kidsPlay: Rule = (c) => {
  if (c.p.household.children < 1 || c.aqi < AQI.PROTECT_FROM) return null;
  return outdoorOrIndoors(c, {
    best: c.bestHour,
    limit: c.limits.vulnerable,
    vent: K.VENT.light,
    hours: TIME.KIDS_PLAY_H,
    usualPm25: c.avg.evening,
    window: (best, avoided) => ({
      id: "kids-play-window",
      group: "outdoor",
      text: COPY["kids-play-window"]({ window: best, aqi: best.aqi, eveningPm25: c.avg.evening }),
      impact: { inhaledPm25Ug: avoided },
      window: best,
      forWhom: [WHO.kids],
    }),
    indoors: (cmp, avoided) => ({
      id: "kids-play-indoors",
      group: "outdoor",
      text: COPY["kids-play-indoors"](cmp),
      impact: { inhaledPm25Ug: avoided },
      forWhom: [WHO.kids],
    }),
  });
};

export const eldersWalk: Rule = (c) => {
  if (c.p.household.elders < 1 || c.aqi < AQI.PROTECT_FROM) return null;
  return outdoorOrIndoors(c, {
    best: c.bestHour,
    limit: c.limits.vulnerable,
    vent: K.VENT.walk,
    hours: TIME.ELDER_WALK_H,
    usualPm25: c.avg.early,
    window: (best, avoided) => ({
      id: "elders-walk-window",
      group: "outdoor",
      text: COPY["elders-walk-window"]({ window: best, aqi: best.aqi, earlyPm25: c.avg.early }),
      impact: { inhaledPm25Ug: avoided },
      window: best,
      forWhom: [WHO.elders],
    }),
    indoors: (cmp, avoided) => ({
      id: "elders-walk-indoors",
      group: "outdoor",
      text: COPY["elders-walk-indoors"](cmp),
      impact: { inhaledPm25Ug: avoided },
      forWhom: [WHO.elders],
    }),
  });
};
