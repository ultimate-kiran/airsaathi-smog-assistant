import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Actions from "../src/components/Actions";
import HourStrip from "../src/components/HourStrip";
import ProfileForm from "../src/components/ProfileForm";
import Summary from "../src/components/Summary";
import Tracker from "../src/components/Tracker";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { buildPlan } from "../src/lib/engine";
import type { PlanView, Profile } from "../src/lib/types";
import { PROFILE, openMeteoPayload } from "./helpers";

const planFor = (p: Profile, pm = 140): PlanView => ({
  ...buildPlan(p, snapshotFromOpenMeteo(openMeteoPayload(pm, pm * 1.4))),
  aiEnabled: false,
});
const noop = () => {};

describe("HourStrip", () => {
  it("labels every bar for screen readers and ticks in the reader's language", () => {
    const en = renderToStaticMarkup(<HourStrip plan={planFor(PROFILE)} lang="en" />);
    expect((en.match(/class="sr-only"/g) ?? []).length).toBe(24);
    expect(en).toMatch(/AQI \d+/);
    const hi = renderToStaticMarkup(<HourStrip plan={planFor({ ...PROFILE, lang: "hi" })} lang="hi" />);
    expect(hi).toMatch(/बजे/);
    expect(hi).not.toMatch(/\d (am|pm)/);
  });
});

describe("Actions", () => {
  it("shows the commute alternatives with the pick-one note, and totals", () => {
    const html = renderToStaticMarkup(
      <Actions plan={planFor({ ...PROFILE, commute: { mode: "car", km: 15 } })} lang="en" doneIds={new Set()} onToggle={noop} />,
    );
    expect(html).toContain("Start here");
    expect(html).toContain("Pick one of these ways to commute.");
    expect(html).toContain("less breathed in");
  });

  it("has no English left in the Hindi totals", () => {
    const html = renderToStaticMarkup(
      <Actions plan={planFor({ ...PROFILE, lang: "hi" })} lang="hi" doneIds={new Set()} onToggle={noop} />,
    );
    expect(html).toContain("कम साँस में");
    expect(html).not.toContain("less breathed in");
  });
});

describe("Tracker", () => {
  it("explains what to do when nothing is logged yet", () => {
    expect(renderToStaticMarkup(<Tracker log={{}} lang="en" />)).toContain("Tick the steps you take");
  });
});

describe("Summary and ProfileForm", () => {
  it("summarises the household with localised units", () => {
    const html = renderToStaticMarkup(<Summary profile={{ ...PROFILE, lang: "hi" }} onEdit={noop} />);
    expect(html).toContain("किमी");
    expect(html).toContain("अक्सर खुली");
  });

  it("renders real radio inputs with the current answer checked", () => {
    const html = renderToStaticMarkup(
      <ProfileForm profile={PROFILE} busy={false} canSubmit editing={false} onChange={noop} onSubmit={noop} onCancel={noop} />,
    );
    expect((html.match(/type="radio"/g) ?? []).length).toBe(6 + 4 + 3 + 2);
    expect(html).toMatch(/type="radio"[^>]*checked=""/);
  });
});
