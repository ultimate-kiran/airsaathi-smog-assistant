/**
 * The page's one memorable element: a city at dusk that disappears as the AQI climbs.
 * Far buildings vanish first, then the middle ones, the sun dims, and haze fills in from the ground up.
 * Lit windows glow through the haze, so a smoggy skyline still reads as a city.
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
  /** lit windows as [dx, dy] offsets from the block's top-left */
  lights: [number, number][];
}

function layer(seed: number, minH: number, maxH: number, minW: number, maxW: number, lit: number): Block[] {
  const rnd = seeded(seed);
  const blocks: Block[] = [];
  let x = -20;
  while (x < 1220) {
    const w = minW + rnd() * (maxW - minW);
    const h = minH + rnd() * (maxH - minH);
    const lights: [number, number][] = [];
    if (lit > 0) {
      for (let wy = 14; wy < h - 10; wy += 16) {
        for (let wx = 8; wx < w - 12; wx += 14) {
          if (rnd() < lit) lights.push([wx, wy]);
        }
      }
    }
    blocks.push({ x, w: w + 1, h, lights });
    x += w;
  }
  return blocks;
}

const FAR = layer(11, 50, 120, 30, 70, 0);
const MID = layer(23, 70, 170, 36, 80, 0.07);
const NEAR = layer(37, 90, 200, 44, 96, 0.16);
const H = 260;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function Layer({ blocks, fill, opacity, glow }: { blocks: Block[]; fill: string; opacity: number; glow: number }) {
  return (
    <g className="sk-layer" style={{ opacity }}>
      <g fill={fill}>
        {blocks.map((b, i) => (
          <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      {glow > 0 && (
        <g fill="#f6c872" opacity={glow}>
          {blocks.flatMap((b, i) =>
            b.lights.map(([dx, dy], j) => <rect key={`${i}-${j}`} x={b.x + dx} y={H - b.h + dy} width="5" height="7" rx="1" />),
          )}
        </g>
      )}
    </g>
  );
}

export default function Skyline({ aqi }: { aqi: number }) {
  const far = clamp(1 - aqi / 220, 0.06, 1);
  const mid = clamp(1 - aqi / 380, 0.1, 1);
  const near = clamp(1 - aqi / 650, 0.34, 1);
  const sun = clamp(1 - aqi / 340, 0.12, 1);

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
        <circle cx="960" cy="92" r="104" fill="url(#sun-grad)" opacity="0.45" />
        <circle cx="960" cy="92" r="30" fill="#f6c872" />
      </g>

      <Layer blocks={FAR} fill="#35566a" opacity={far} glow={0} />
      <Layer blocks={MID} fill="#1f3a4b" opacity={mid} glow={0.5} />
      <Layer blocks={NEAR} fill="#0b1823" opacity={near} glow={0.85} />
    </svg>
  );
}

/** Ground haze is plain CSS, not part of the SVG, so its top edge fades to nothing instead of being cropped. */
export function SkylineHaze({ aqi }: { aqi: number }) {
  return <div className="skyline-haze" aria-hidden="true" style={{ opacity: clamp(aqi / 380, 0.06, 0.9) }} />;
}
