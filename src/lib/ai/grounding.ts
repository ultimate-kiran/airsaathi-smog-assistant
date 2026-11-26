/**
 * The guard against invented figures: every number above SMALL in the model's text must be a
 * number that appears in the context we gave it.
 *
 * Numbers glued to the end of a word are names, not figures (N95, FFP2, PM2.5, PM10, KN95), so
 * they are not checked. Numbers followed by a unit ("540µg", "3pm") still are.
 */
const SMALL = 60;
const STANDALONE = /(?<![A-Za-z\d.,])\d[\d,]*(?:\.\d+)?/g;
const ANY = /\d[\d,]*(?:\.\d+)?/g;

const toNumber = (raw: string) => Number(raw.replace(/,/g, ""));

/** Every number in the context, exactly and rounded, so "540.4" in the context allows "540". */
function knownNumbers(contextJson: string): Set<number> {
  const out = new Set<number>();
  for (const raw of contextJson.match(ANY) ?? []) {
    const n = toNumber(raw);
    if (!Number.isFinite(n)) continue;
    out.add(n);
    out.add(Math.round(n));
  }
  return out;
}

export function numbersGrounded(text: string, contextJson: string): boolean {
  const known = knownNumbers(contextJson);
  return (text.match(STANDALONE) ?? []).every((raw) => {
    const n = toNumber(raw);
    return !Number.isFinite(n) || n <= SMALL || known.has(n);
  });
}
