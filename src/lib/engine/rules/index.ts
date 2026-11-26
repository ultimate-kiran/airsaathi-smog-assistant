import type { Rule } from "../rule";
import { sensitivePlan, wasteBurning } from "./care";
import { airOutWhenClean, purifier, smartVentilation } from "./indoor";
import { cookingFuel, indoorBurning, kitchenExhaust } from "./kitchen";
import { carToTransit, carpool, commuteMask, wfhSevere } from "./move";
import { eldersWalk, exercise, kidsPlay } from "./outdoor";

/** Every rule the engine runs. Order does not matter: actions are ranked by priority afterwards. */
export const RULES: readonly Rule[] = [
  wfhSevere,
  carToTransit,
  carpool,
  commuteMask,
  exercise,
  kidsPlay,
  eldersWalk,
  purifier,
  smartVentilation,
  airOutWhenClean,
  indoorBurning,
  cookingFuel,
  kitchenExhaust,
  sensitivePlan,
  wasteBurning,
];
