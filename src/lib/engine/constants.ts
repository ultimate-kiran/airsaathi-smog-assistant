/**
 * Every assumption the engine makes, named in one place. Rounded, published-range values:
 * they are estimates and the UI says so. Explanations quote these, so changing a value here
 * changes the number and the text that explains it together.
 */
export const K = {
  /** breathing volume, m³ of air per hour */
  VENT: { rest: 0.45, sleep: 0.35, light: 1.0, walk: 1.2, cooking: 0.9, moderate: 2.2 },
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

/** How long each activity lasts, in hours, and how fast people travel. */
export const TIME = {
  KIDS_PLAY_H: 1,
  ELDER_WALK_H: 0.75,
  AWAKE_AT_HOME_H: 14,
  SLEEP_H: 8,
  HEATING_FIRE_H: 4,
  COOKING_H: 2,
  BIKE_KMH: 25,
  WALK_KMH: 5,
  /** cap on daily time counted for walkers */
  WALK_MAX_H: 2,
  /** time a bus commuter spends at stops and walking to them */
  BUS_EXPOSED_H: 0.67,
  /** longest outdoor exercise window the engine looks for */
  EXERCISE_MAX_WINDOW_H: 3,
} as const;

/** AQI levels at which advice changes. */
export const AQI = {
  /** below this the air is fine and most protective steps are not needed */
  PROTECT_FROM: 100,
  MASK_FROM: 150,
  OPEN_BURNING_FROM: 150,
  WFH_FROM: 300,
  /** the cleanest window must be at or under these to recommend going out */
  SENSITIVE_LIMIT: 100,
  VULNERABLE_LIMIT: 150,
  EXERCISE_LIMIT: 200,
} as const;

export const TRIP = {
  /** shorter car trips are not worth a transit swap */
  MIN_CAR_SWAP_KM: 2,
  MIN_WFH_KM: 1,
  /** two people in the car */
  CARPOOL_SHARE: 0.5,
  /** a mask is only worth recommending above this avoided dose (µg/day) */
  MIN_MASK_UG: 5,
} as const;

/** Local hours used for comparisons ("versus a 6–8 am walk"). */
export const HOURS = {
  EARLY: [6, 7, 8],
  EVENING: [17, 18, 19],
  RUSH: [8, 9, 10, 17, 18, 19],
  NIGHT: [22, 23, 0, 1, 2, 3, 4, 5],
  DAY_FIRST: 6,
  DAY_LAST: 19,
} as const;
