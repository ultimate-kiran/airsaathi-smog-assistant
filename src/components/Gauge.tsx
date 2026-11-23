"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/aqi";

const CX = 160;
const CY = 156;
const R = 128;
const SW = 20;

const polar = (a: number, r = R) => [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;

/** Six equal segments, one per CPCB band, so every band stays readable. Angle runs from π (left) to 0 (right). */
function arc(i: number): string {
  const gap = 0.018;
  const a0 = Math.PI - (i / 6) * Math.PI - gap;
  const a1 = Math.PI - ((i + 1) / 6) * Math.PI + gap;
  const [x0, y0] = polar(a0);
  const [x1, y1] = polar(a1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Position 0..1 along the dial: which band, plus how far through it. */
function position(aqi: number): number {
  const v = Math.max(0, Math.min(500, aqi));
  const idx = Math.max(
    0,
    CATEGORIES.findIndex((c) => v <= c.max),
  );
  const lo = idx === 0 ? 0 : CATEGORIES[idx - 1].max;
  const frac = (v - lo) / (CATEGORIES[idx].max - lo);
  return Math.min(1, (idx + frac) / 6);
}

export default function Gauge({ aqi, label }: { aqi: number; label: string }) {
  // Starts at zero and sweeps to the value once mounted: the page's one orchestrated moment.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [aqi]);

  const deg = (shown ? position(aqi) : 0) * 180;

  return (
    <div className="gauge" role="img" aria-label={`AQI ${aqi}, ${label}`}>
      <svg viewBox="0 0 320 176" aria-hidden="true" focusable="false">
        {CATEGORIES.map((c, i) => (
          <path key={c.key} d={arc(i)} stroke={c.color} strokeWidth={SW} fill="none" strokeLinecap="butt" />
        ))}
        <g className="gauge__dot" style={{ transform: `rotate(${deg}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
          <circle cx={CX - R} cy={CY} r={SW / 2 + 5} fill="#ffffff" />
          <circle cx={CX - R} cy={CY} r={SW / 2 - 3} fill="#0a1a26" />
        </g>
        <text x={CX - R} y={CY + 22} className="gauge__end" textAnchor="middle">
          0
        </text>
        <text x={CX + R} y={CY + 22} className="gauge__end" textAnchor="middle">
          500
        </text>
      </svg>
      <div className="gauge__read" aria-hidden="true">
        <span className="gauge__value">{aqi}</span>
        <span className="gauge__unit">AQI</span>
      </div>
    </div>
  );
}
