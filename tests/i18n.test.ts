import { describe, expect, it } from "vitest";
import { UI } from "../src/lib/i18n";
import { ERROR_CODES, type Lang } from "../src/lib/types";

/**
 * The interface text tables. A missing or untranslated string would only show up when that exact
 * screen is reached in that language, so these checks walk every entry in both languages.
 */
const LANGS: Lang[] = ["en", "hi"];
const DEVANAGARI = /[ऀ-ॿ]/;

/** Every leaf of a text table with its path, e.g. ["errors.network", "…"] or ["steps.0.title", "…"]. */
function leaves(value: unknown, path = ""): [string, unknown][] {
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => leaves(child, path ? `${path}.${key}` : key));
  }
  return [[path, value]];
}

const paths = (lang: Lang) => leaves(UI[lang]).map(([path]) => path);
const strings = (lang: Lang) =>
  leaves(UI[lang]).filter((leaf): leaf is [string, string] => typeof leaf[1] === "string");
const templates = (lang: Lang) =>
  Object.entries(UI[lang]).filter((entry): entry is [string, (...args: unknown[]) => string] => {
    return typeof entry[1] === "function";
  });

describe("interface text", () => {
  it("has exactly the same entries in English and Hindi, including nested lists", () => {
    expect(paths("hi")).toEqual(paths("en"));
  });

  it.each(LANGS)("has a message for every API error code in %s", (lang) => {
    for (const code of ERROR_CODES) expect(UI[lang].errors[code], code).toBeTruthy();
  });

  it.each(LANGS)("has no empty or untrimmed strings in %s", (lang) => {
    for (const [path, value] of strings(lang)) {
      expect(value.trim(), path).not.toBe("");
      expect(value, path).toBe(value.trim());
    }
  });

  it("translates every Hindi sentence rather than repeating the English", () => {
    const english = new Map(strings("en"));
    const untranslated = strings("hi").filter(
      ([path, value]) => !DEVANAGARI.test(value) && value === english.get(path),
    );
    // Unit symbols and acronyms read the same in both languages.
    expect(untranslated.every(([, value]) => /^[A-Za-z0-9µ³₂.\s/%-]{1,8}$/.test(value))).toBe(true);
  });

  it.each(LANGS)("fills every %s template with the values it is given", (lang) => {
    expect(templates(lang).length).toBeGreaterThan(5);
    for (const [name, template] of templates(lang)) {
      const output = template(7, 3);
      expect(output, name).toContain("7");
      if (template.length === 2) expect(output, name).toContain("3");
      if (lang === "hi") expect(output, name).toMatch(DEVANAGARI);
    }
  });

  it("uses the singular and plural correctly in English", () => {
    expect(UI.en.cigarettes(1)).toContain("1 cigarette.");
    expect(UI.en.cigarettes(4)).toContain("4 cigarettes.");
  });

  it.each(LANGS)("says when there is no streak yet in %s", (lang) => {
    expect(UI[lang].streak(0)).not.toContain("0");
    expect(UI[lang].streak(3)).toContain("3");
  });
});
