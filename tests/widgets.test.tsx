// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import AskBox from "../src/components/AskBox";
import HourStrip from "../src/components/HourStrip";
import PlaceSearch from "../src/components/PlaceSearch";
import ProfileForm from "../src/components/ProfileForm";
import ShareBar from "../src/components/ShareBar";
import { snapshotFromOpenMeteo } from "../src/lib/airdata";
import { ClientError, api } from "../src/lib/client/api";
import { toGrid } from "../src/lib/distance";
import { buildPlan } from "../src/lib/engine";
import { formatAccuracy } from "../src/lib/geo";
import { SAMPLE_PLACES, UI } from "../src/lib/i18n";
import { shareText } from "../src/lib/share";
import type { PlanResponse } from "../src/lib/types";
import { button, click, input, mount, settle, submit, text, typeInto, setupDom } from "./dom";
import { openMeteoPayload, PROFILE } from "./helpers";

setupDom();

const t = UI.en;
const plan = (): PlanResponse => buildPlan(PROFILE, snapshotFromOpenMeteo(openMeteoPayload()));

/** Replaces a browser API that jsdom does not provide, for one test. */
function stubNavigator(key: "clipboard" | "geolocation", value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true });
}

describe("AskBox", () => {
  const askInput = () => input(`input[placeholder="${t.askPlaceholder}"]`);

  it("sends the trimmed question with the profile and shows the answer", async () => {
    const ask = vi.spyOn(api, "ask").mockResolvedValue({ answer: "Yes, between 2 and 4 pm.", source: "rules" });
    await mount(<AskBox profile={PROFILE} />);
    await typeInto(askInput(), "  Can the kids play outside?  ");
    await click(t.askButton);
    expect(ask).toHaveBeenCalledWith("Can the kids play outside?", PROFILE, expect.any(AbortSignal));
    expect(text(".ask__answer")).toBe("Yes, between 2 and 4 pm.");
  });

  it("asks a suggested question in one tap", async () => {
    const ask = vi.spyOn(api, "ask").mockResolvedValue({ answer: "Keep them closed.", source: "ai" });
    await mount(<AskBox profile={PROFILE} />);
    await click(t.suggestions[1]);
    expect(ask).toHaveBeenCalledWith(t.suggestions[1], PROFILE, expect.any(AbortSignal));
    expect(askInput().value).toBe(t.suggestions[1]);
  });

  it("shows the translated error and no answer when the request fails", async () => {
    vi.spyOn(api, "ask").mockRejectedValue(new ClientError("rate_limited"));
    await mount(<AskBox profile={PROFILE} />);
    await typeInto(askInput(), "Is it safe to go out?");
    await submit(askInput().form!);
    expect(text(".error")).toBe(t.errors.rate_limited);
    expect(document.querySelector(".ask__answer")).toBeNull();
  });

  it("keeps the Ask button disabled until the question is long enough", async () => {
    const ask = vi.spyOn(api, "ask");
    await mount(<AskBox profile={PROFILE} />);
    await typeInto(askInput(), " a ");
    expect(button(t.askButton).disabled).toBe(true);
    await submit(askInput().form!);
    expect(ask).not.toHaveBeenCalled();
  });
});

describe("ShareBar", () => {
  it("copies the plan summary and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator("clipboard", { writeText });
    const p = plan();
    await mount(<ShareBar plan={p} lang="en" />);
    await click(t.copy);
    expect(writeText).toHaveBeenCalledWith(shareText(p, "en"));
    expect(button(t.copied)).toBeTruthy();
  });

  it("stays on Copy when the clipboard refuses", async () => {
    stubNavigator("clipboard", { writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    await mount(<ShareBar plan={plan()} lang="en" />);
    await click(t.copy);
    expect(button(t.copy)).toBeTruthy();
  });

  it("links to WhatsApp with the summary as the message", async () => {
    const p = plan();
    await mount(<ShareBar plan={p} lang="en" />);
    const link = document.querySelector<HTMLAnchorElement>(".share a")!;
    expect(link.getAttribute("href")).toBe(`https://wa.me/?text=${encodeURIComponent(shareText(p, "en"))}`);
    expect(link.rel).toBe("noopener noreferrer");
  });
});

describe("PlaceSearch", () => {
  const DELHI = { name: "Delhi, India", short: "Delhi", lat: 28.61, lon: 77.21 };
  const DEBOUNCE_WAIT_MS = 350;
  const searchBox = () => input('input[type="search"]');

  it("searches after a pause, then picks a result and clears the box", async () => {
    const search = vi.spyOn(api, "search").mockResolvedValue([DELHI]);
    const onPick = vi.fn();
    await mount(<PlaceSearch lang="en" onPick={onPick} />);
    await typeInto(searchBox(), "Delh");
    expect(search).not.toHaveBeenCalled();
    await settle(DEBOUNCE_WAIT_MS);
    expect(search).toHaveBeenCalledWith("Delh", expect.any(AbortSignal));
    await click(DELHI.name);
    expect(onPick).toHaveBeenCalledWith(DELHI);
    expect(searchBox().value).toBe("");
  });

  it("says so when nothing matches, and ignores one-letter queries", async () => {
    const search = vi.spyOn(api, "search").mockResolvedValue([]);
    await mount(<PlaceSearch lang="en" onPick={vi.fn()} />);
    await typeInto(searchBox(), "D");
    await settle(DEBOUNCE_WAIT_MS);
    expect(search).not.toHaveBeenCalled();
    await typeInto(searchBox(), "Zzzz");
    await settle(DEBOUNCE_WAIT_MS);
    expect(text(".search__note")).toBe(t.noPlaces);
  });

  it("picks a sample city", async () => {
    const onPick = vi.fn();
    await mount(<PlaceSearch lang="en" onPick={onPick} />);
    await click(SAMPLE_PLACES[1].short);
    expect(onPick).toHaveBeenCalledWith(SAMPLE_PLACES[1]);
  });

  it("uses an accurate device location, rounded to the grid, and names the area", async () => {
    stubNavigator("geolocation", {
      watchPosition: (ok: PositionCallback) => {
        ok({ coords: { latitude: 28.6139, longitude: 77.209, accuracy: 40 } } as GeolocationPosition);
        return 1;
      },
      clearWatch: vi.fn(),
    });
    const lat = toGrid(28.6139);
    const lon = toGrid(77.209);
    vi.spyOn(api, "reverse").mockResolvedValue({
      name: "Connaught Place, New Delhi",
      short: "Connaught Place",
      lat,
      lon,
    });
    const onPick = vi.fn();
    await mount(<PlaceSearch lang="en" onPick={onPick} />);
    await click(t.useLocation);
    await settle();
    expect(onPick).toHaveBeenCalledWith({ name: "Connaught Place, New Delhi", short: "Connaught Place", lat, lon });
    expect(text(".search__note")).toBe(t.locFound(formatAccuracy(40)));
  });

  it("explains a blocked location permission", async () => {
    stubNavigator("geolocation", {
      watchPosition: (_ok: PositionCallback, fail: PositionErrorCallback) => {
        fail({ code: 1 } as GeolocationPositionError);
        return 1;
      },
      clearWatch: vi.fn(),
    });
    const onPick = vi.fn();
    await mount(<PlaceSearch lang="en" onPick={onPick} />);
    await click(t.useLocation);
    await settle();
    expect(onPick).not.toHaveBeenCalled();
    expect(text(".search__note")).toBe(t.locDenied);
  });

  it("explains when the browser has no location support", async () => {
    stubNavigator("geolocation", undefined);
    await mount(<PlaceSearch lang="en" onPick={vi.fn()} />);
    await click(t.useLocation);
    await settle();
    expect(text(".search__note")).toBe(t.locUnsupported);
  });
});

describe("HourStrip", () => {
  const avoidCount = () => document.querySelectorAll(".strip__col.is-avoid").length;

  it("marks only the hours inside the avoid stretch", async () => {
    const p = plan();
    const avoid = { start: p.hours[2].hour, end: p.hours[5].hour, allDay: false };
    await mount(<HourStrip plan={{ ...p, avoid }} lang="en" />);
    expect(avoidCount()).toBe(3);
    expect(document.querySelectorAll(".strip__col.is-best")).toHaveLength(p.bestWindow ? 1 : 0);
  });

  it("marks every hour and says so when the whole day is bad", async () => {
    const p = plan();
    await mount(<HourStrip plan={{ ...p, avoid: { start: 0, end: 0, allDay: true } }} lang="en" />);
    expect(avoidCount()).toBe(p.hours.length);
    expect(text(".windows__worst dd")).toBe(t.allDay);
  });

  it("shows no avoid window on a clean day, or for a stretch outside the forecast", async () => {
    const p = plan();
    await mount(<HourStrip plan={{ ...p, avoid: null }} lang="en" />);
    expect(document.querySelector(".windows__worst")).toBeNull();
    expect(avoidCount()).toBe(0);
  });
});

describe("ProfileForm sections", () => {
  async function render(onSubmit = vi.fn()) {
    await mount(
      <ProfileForm profile={PROFILE} busy={false} canSubmit editing={false} onSubmit={onSubmit} onCancel={vi.fn()} />,
    );
    return onSubmit;
  }
  const radio = (label: string) =>
    Array.from(document.querySelectorAll<HTMLInputElement>('input[type="radio"]')).find(
      (r) => r.labels?.[0]?.textContent === label,
    )!;
  const checkbox = (label: string) =>
    Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).find((c) =>
      c.labels?.[0]?.textContent?.includes(label),
    )!;

  it("hides the distance slider for work from home, and the minutes slider without outdoor exercise", async () => {
    await render();
    expect(document.querySelectorAll('input[type="range"]')).toHaveLength(2);
    await click(radio(t.mode.wfh));
    await click(checkbox(t.exerciseOutdoor));
    expect(document.querySelectorAll('input[type="range"]')).toHaveLength(0);
  });

  it("submits every answer the visitor changed", async () => {
    const onSubmit = await render();
    await click(radio(t.cooking.biomass));
    await click(radio(t.heating.electric));
    await click(checkbox(t.purifier));
    await click(checkbox(t.respiratory));
    await click(`${t.elders}: −1`);
    await submit(document.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledWith({
      ...PROFILE,
      cooking: "biomass",
      heating: "electric",
      hasPurifier: true,
      household: { ...PROFILE.household, respiratory: true, elders: 0 },
    });
  });
});
