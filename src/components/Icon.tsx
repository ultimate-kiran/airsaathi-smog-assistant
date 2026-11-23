import type { ReactNode } from "react";

/** Small inline icon set (24px grid, stroke only). Decorative: always hidden from assistive tech. */
const PATHS: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  send: <path d="M4 12 20 4l-4.5 16-3.5-6.5L4 12Zm8 1.5L20 4" />,
  share: (
    <>
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="17" cy="6" r="2.4" />
      <circle cx="17" cy="18" r="2.4" />
      <path d="m8.1 10.8 6.8-3.6M8.1 13.2l6.8 3.6" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </>
  ),
  edit: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Zm9.5-13.5 4 4" />,
  car: (
    <>
      <path d="M5 16H3.5v-4l2-5A2 2 0 0 1 7.4 5.5h9.2a2 2 0 0 1 1.9 1.5l2 5v4H19" />
      <path d="M3.5 12h17M9 16h6" />
      <circle cx="7" cy="16.5" r="2" />
      <circle cx="17" cy="16.5" r="2" />
    </>
  ),
  bike: (
    <>
      <circle cx="6" cy="16.5" r="3.5" />
      <circle cx="18" cy="16.5" r="3.5" />
      <path d="M6 16.5 9.5 9H14l4 7.5M9.5 9 8 6.5H6M12.5 12.5H8" />
    </>
  ),
  bus: (
    <>
      <rect x="4" y="4" width="16" height="13" rx="3" />
      <path d="M4 11h16M8 4v7M16 4v7M7 20v-3M17 20v-3" />
      <circle cx="8" cy="14" r=".6" fill="currentColor" />
      <circle cx="16" cy="14" r=".6" fill="currentColor" />
    </>
  ),
  metro: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="4" />
      <path d="M5 10.5h14M8 21l2-4M16 21l-2-4" />
      <circle cx="9" cy="13.8" r=".7" fill="currentColor" />
      <circle cx="15" cy="13.8" r=".7" fill="currentColor" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.8" />
      <path d="m10 21 2-6-2.5-2.5 1-4.5 3.5 1.5 2 3M12 15l2.5 2.5V21M9.5 12.5 7 14" />
    </>
  ),
  home: (
    <>
      <path d="m3.5 11 8.5-7.5 8.5 7.5" />
      <path d="M5.5 9.5V20h13V9.5M10 20v-5.5h4V20" />
    </>
  ),
  lpg: (
    <>
      <path d="M9 3.5h6M10 3.5v2M14 3.5v2" />
      <path d="M7 9a3 3 0 0 1 3-3.5h4A3 3 0 0 1 17 9v9.5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9Z" />
      <path d="M7 11.5h10M7 16h10" />
    </>
  ),
  png: (
    <>
      <path d="M3 9.5h9a3 3 0 0 1 3 3V20" />
      <path d="M2.5 7.5h3v4h-3zM13 20h4M16 6.5V3.5M13.5 6.5h5" />
    </>
  ),
  induction: <path d="M13 2.5 4.5 13.5h6.5L10 21.5l9-11.5h-6.5L13 2.5Z" />,
  wood: (
    <>
      <path d="M12 3c.8 3-2.8 4.6-2.8 8a2.8 2.8 0 0 0 5.6 0c0-1-.4-1.8-1-2.6 2.8.9 4.7 3.4 4.7 6.2A6.5 6.5 0 0 1 12 21a6.5 6.5 0 0 1-6.5-6.4C5.5 9.4 10 7.6 12 3Z" />
    </>
  ),
  none: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m6 6 12 12" />
    </>
  ),
  heater: (
    <>
      <rect x="4" y="13" width="16" height="7" rx="2" />
      <path d="M8 10.5c-1.2-1.6 1.2-2.4 0-4M12 10.5c-1.2-1.6 1.2-2.4 0-4M16 10.5c-1.2-1.6 1.2-2.4 0-4M8 20v1.5M16 20v1.5" />
    </>
  ),
  windowOpen: <path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7a2 2 0 1 1-2 2" />,
  windowShut: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
      <path d="M12 3.5v17M4.5 12h15" />
    </>
  ),
  run: (
    <>
      <circle cx="15" cy="4.5" r="1.8" />
      <path d="m6.5 20 3-5 3 1.5 1.5-5.5-3-1.5-2.5 2.5M14 11l3 2.5 3-.5M12.5 16.5 14.5 21" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  leaf: (
    <path d="M5 19c0-8 4-13 14-14 0 9-4.5 14-12 14M5 19c2-3.5 5-6 8-7.5" />
  ),
  alert: (
    <>
      <path d="M12 4 3 19.5h18L12 4Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17" r=".6" fill="currentColor" />
    </>
  ),
  sparkle: <path d="M12 3.5 14 10l6.5 2L14 14l-2 6.5L10 14 3.5 12 10 10l2-6.5Z" />,
};

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="icon"
    >
      {PATHS[name]}
    </svg>
  );
}
