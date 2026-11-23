/**
 * The page's one memorable element: a city that disappears as the AQI climbs.
 * Far buildings vanish first, then the middle ones, the sun dims, and haze fills in from the ground up.
 */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface Block {
  x: number;
  w: number;
  h: number;
}

function layer(seed: number, minH: number, maxH: number, minW: number, maxW: number): Block[] {
  const rnd = seeded(seed);
  const blocks: Block[] = [];
  let x = -20;
  while (x < 1220) {
    const w = minW + rnd() * (maxW - minW);
    const h = minH + rnd() * (maxH - minH);
    blocks.push({ x, w: w + 1, h });
    x += w;
  }
  return blocks;
}

const FAR = layer(11, 50, 120, 30, 70);
const MID = layer(23, 70, 170, 36, 80);
const NEAR = layer(37, 90, 200, 44, 96);
const H = 260;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default function Skyline({ aqi }: { aqi: number }) {
  const far = clamp(1 - aqi / 220, 0.06, 1);
  const mid = clamp(1 - aqi / 380, 0.1, 1);
  const near = clamp(1 - aqi / 650, 0.28, 1);
  const sun = clamp(1 - aqi / 340, 0.1, 1);

  return (
    <svg
      className="skyline"
      viewBox={`0 0 1200 ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="sun-grad">
          <stop offset="0" stopColor="#f7cf80" stopOpacity="1" />
          <stop offset="1" stopColor="#f7cf80" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="sk-sun" style={{ opacity: sun }}>
        <circle cx="960" cy="86" r="86" fill="url(#sun-grad)" opacity="0.5" />
        <circle cx="960" cy="86" r="30" fill="#f6c872" />
      </g>

      <g className="sk-layer" style={{ opacity: far }} fill="#93a4ac">
        {FAR.map((b, i) => (
          <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      <g className="sk-layer" style={{ opacity: mid }} fill="#5f737e">
        {MID.map((b, i) => (
          <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      <g className="sk-layer" style={{ opacity: near }} fill="#25343f">
        {NEAR.map((b, i) => (
          <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} />
        ))}
      </g>

    </svg>
  );
}

/** Ground haze is plain CSS, not part of the SVG, so its top edge fades to nothing instead of being cropped. */
export function SkylineHaze({ aqi }: { aqi: number }) {
  return <div className="skyline-haze" aria-hidden="true" style={{ opacity: clamp(aqi / 420, 0.05, 0.88) }} />;
}
