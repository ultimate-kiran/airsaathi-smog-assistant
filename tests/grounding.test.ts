import { describe, expect, it } from "vitest";
import { numbersGrounded } from "../src/lib/ai";

const ctx = JSON.stringify({ aqiNow: 133, pm25: 57, totals: { inhaledPm25Ug: 540, co2eKg: 3.4 }, window: "2 pm–3 pm" });

describe("numbersGrounded", () => {
  it("does not treat product and pollutant names as figures (the mask bug)", () => {
    expect(numbersGrounded("Buy a fitted N95 or FFP2 mask; KN95 works too.", ctx)).toBe(true);
    expect(numbersGrounded("PM2.5 and PM10 are both high at AQI 133.", ctx)).toBe(true);
  });

  it("still checks figures followed by a unit", () => {
    expect(numbersGrounded("You avoid 540µg today.", ctx)).toBe(true);
    expect(numbersGrounded("You avoid 990µg today.", ctx)).toBe(false);
  });

  it("matches whole numbers, not substrings of bigger ones", () => {
    // 133 is in the context, but 1330 is not, even though "133" is a prefix of it
    expect(numbersGrounded("That is 1330 micrograms.", ctx)).toBe(false);
    expect(numbersGrounded("That is 13 times more.", JSON.stringify({ x: 1330 }))).toBe(true);
  });

  it("accepts Indian digit grouping and rounded context values", () => {
    expect(numbersGrounded("About 1,23,456 people.", JSON.stringify({ n: 123456 }))).toBe(true);
    expect(numbersGrounded("About 541 µg.", JSON.stringify({ n: 540.6 }))).toBe(true);
  });

  it("lets small numbers through: steps, minutes, hours", () => {
    expect(numbersGrounded("Take 3 steps, 10 minutes each, before 6 pm.", ctx)).toBe(true);
  });
});
