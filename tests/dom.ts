import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * Helpers for interaction tests that render real components into jsdom.
 * A file opts in with `// @vitest-environment jsdom` and a call to setupDom().
 */
let root: Root | null = null;

/** Registers the per-test setup and teardown: a clean document, clean storage, React's act() mode. */
export function setupDom() {
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("requestAnimationFrame", () => 0);
    localStorage.clear();
    document.body.replaceChildren();
  });
  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
}

export async function mount(element: ReactElement) {
  root = createRoot(document.body.appendChild(document.createElement("div")));
  await act(async () => root?.render(element));
}

/** A button by its accessible name: aria-label when present, otherwise its trimmed text. */
export function button(name: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll("button")).find(
    (b) => (b.getAttribute("aria-label") ?? b.textContent?.trim()) === name,
  );
  if (!found) throw new Error(`Missing button: ${name}`);
  return found;
}

export async function click(target: string | HTMLElement) {
  const el = typeof target === "string" ? button(target) : target;
  await act(async () => el.click());
}

/** Sets an input's value the way typing does, so React's onChange fires. */
export async function typeInto(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setValue?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

export async function submit(form: HTMLFormElement) {
  await act(async () => form.requestSubmit());
}

/** Lets pending timers and promise callbacks run inside act(). */
export async function settle(ms = 0) {
  await act(() => new Promise((resolve) => setTimeout(resolve, ms)));
}

export const text = (selector: string) => document.querySelector(selector)?.textContent ?? "";

export function input(selector: string): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>(selector);
  if (!el) throw new Error(`Missing input: ${selector}`);
  return el;
}
