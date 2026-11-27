// @vitest-environment jsdom
import axe from "axe-core";
import { createElement } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import App from "../src/components/App";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { api } from "../src/lib/client/api";
import { buildPlan } from "../src/lib/engine";
import { click, mount, settle, setupDom } from "./dom";
import { openMeteoPayload } from "./helpers";

/**
 * axe-core (WCAG 2.2 A and AA rules) on every screen of the app as it is actually rendered.
 * jsdom has no layout engine, so colour contrast is left to the Lighthouse audit of the live site.
 */
setupDom();

beforeEach(() => {
  const air = snapshotFromOpenMeteo(openMeteoPayload());
  vi.spyOn(api, "plan").mockImplementation(async (p) => ({ ...buildPlan(p, air), aiEnabled: false }));
});

async function violations(): Promise<string[]> {
  const result = await axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: { "color-contrast": { enabled: false } },
  });
  return result.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
}

it("has no WCAG violations on the first screen", async () => {
  await mount(createElement(App));
  expect(await violations()).toEqual([]);
});

it("has no WCAG violations on the household form", async () => {
  await mount(createElement(App));
  await click("Delhi");
  expect(document.querySelector("form.tailor")).not.toBeNull();
  expect(await violations()).toEqual([]);
});

it("has no WCAG violations on the plan, in English and in Hindi", async () => {
  await mount(createElement(App));
  await click("Delhi");
  await click("Or use a typical household");
  await settle();
  expect(document.querySelector("#plan")).not.toBeNull();
  expect(await violations()).toEqual([]);

  await click("हिन्दी");
  await settle();
  expect(await violations()).toEqual([]);
});
