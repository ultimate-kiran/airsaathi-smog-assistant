"use client";

import { useId, type CSSProperties } from "react";
import Icon, { type IconName } from "./Icon";

/* The form's building blocks: each wraps a real input so keyboard and screen-reader behaviour comes for free. */

/** A person counter: big + and − buttons, easier than a number box on a phone. */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  return (
    <div className="stepper" role="group" aria-labelledby={id}>
      <span id={id} className="stepper__label">
        {label}
      </span>
      <div className="stepper__ctl">
        <button type="button" aria-label={`${label}: −1`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Icon name="minus" size={18} />
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`${label}: +1`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}

/** Pick one: large tiles with an icon, built on real radio inputs. Typed by its option keys. */
export function Choices<K extends string>({
  legend,
  value,
  options,
  icons,
  cols,
  onChange,
}: {
  legend: string;
  value: K;
  options: Record<K, string>;
  icons: Record<K, IconName>;
  cols: number;
  onChange: (v: K) => void;
}) {
  const name = useId();
  return (
    <fieldset className="q">
      <legend>{legend}</legend>
      <div className="choices" style={{ "--cols": cols } as CSSProperties}>
        {(Object.entries(options) as [K, string][]).map(([k, label]) => (
          <div className="choice" key={k}>
            <input type="radio" id={`${name}-${k}`} name={name} checked={value === k} onChange={() => onChange(k)} />
            <label htmlFor={`${name}-${k}`}>
              <Icon name={icons[k]} size={24} />
              <span>{label}</span>
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** Yes/no as a pill that fills in when selected. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="toggle">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>
        <span className="toggle__tick">
          <Icon name="check" size={14} />
        </span>
        {label}
      </label>
    </div>
  );
}

/** A number on a track, with its value and unit shown beside the label. */
export function Slider({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="range">
      <div className="range__head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>
          {value} <span>{unit}</span>
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--pct": `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
