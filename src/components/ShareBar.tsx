"use client";

import { useEffect, useRef, useState } from "react";
import { UI } from "@/lib/i18n";
import { shareText } from "@/lib/share";
import type { Lang, PlanResponse } from "@/lib/types";
import Icon from "./Icon";

export default function ShareBar({ plan, lang }: { plan: PlanResponse; lang: Lang }) {
  const t = UI[lang];
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const text = shareText(plan, lang);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="share" aria-labelledby="share-title">
      <h2 id="share-title">{t.shareTitle}</h2>
      <div className="share__row">
        <a
          className="btn btn--primary"
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="share" size={18} />
          {t.shareWhatsApp}
        </a>
        <button type="button" className="btn btn--outline" onClick={() => void copy()}>
          <Icon name={copied ? "check" : "copy"} size={18} />
          {copied ? t.copied : t.copy}
        </button>
      </div>
    </section>
  );
}
