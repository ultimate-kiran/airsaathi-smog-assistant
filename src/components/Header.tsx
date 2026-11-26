import { UI } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" width="34" height="34" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="logo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14303b" />
          <stop offset="1" stopColor="#0a1a26" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10" fill="url(#logo-sky)" />
      <circle cx="21.5" cy="11" r="4.2" fill="#f6c872" />
      <path
        d="M6 17.5h13a2.6 2.6 0 1 0-2.6-2.6M6 22h17.5a2.6 2.6 0 1 1-2.6 2.6M6 26.5h8"
        fill="none"
        stroke="#6fe0c5"
        strokeWidth="1.8"
        strokeLinecap="round"
        transform="translate(0 -3)"
      />
    </svg>
  );
}

const LANGS: { lang: Lang; label: string }[] = [
  { lang: "en", label: "English" },
  { lang: "hi", label: "हिन्दी" },
];

export default function Header({ lang, onLang }: { lang: Lang; onLang: (l: Lang) => void }) {
  const t = UI[lang];
  return (
    <header className="top">
      <div className="top__in">
        <div className="brand">
          <Logo />
          <span className="brand__name">AirSaathi</span>
          <span className="brand__tag">{t.tagline}</span>
        </div>
        <div className="lang" role="group" aria-label={t.language}>
          {LANGS.map((l) => (
            <button
              key={l.lang}
              type="button"
              aria-pressed={lang === l.lang}
              onClick={() => onLang(l.lang)}
              lang={l.lang}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
