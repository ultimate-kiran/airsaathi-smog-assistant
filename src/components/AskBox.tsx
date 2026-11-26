"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ClientError, api, isAbort } from "@/lib/client/api";
import { UI } from "@/lib/i18n";
import type { ErrorCode, Profile } from "@/lib/types";
import Icon from "./Icon";

/** Mount with key={lang}: a language switch starts a fresh box, so no answer shows in the old language. */
export default function AskBox({ profile }: { profile: Profile }) {
  const t = UI[profile.lang];
  const id = useId();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<ErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  async function ask(question: string) {
    const text = question.trim();
    if (text.length < 2 || busy) return;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setBusy(true);
    setError(null);
    setAnswer("");
    try {
      setAnswer((await api.ask(text, profile, c.signal)).answer);
    } catch (e) {
      if (isAbort(e)) return;
      setError(e instanceof ClientError ? e.code : "network");
    } finally {
      if (ctl.current === c) setBusy(false);
    }
  }

  return (
    <section className="panel ask" aria-labelledby="ask-title">
      <h2 id="ask-title">{t.askTitle}</h2>
      <p className="muted">{t.askLead}</p>
      <form
        className="ask__row"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(q);
        }}
      >
        <label htmlFor={id} className="sr-only">
          {t.askTitle}
        </label>
        <input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.askPlaceholder} maxLength={300} />
        <button className="btn btn--primary" type="submit" disabled={busy || q.trim().length < 2}>
          {busy ? t.asking : t.askButton}
          {!busy && <Icon name="send" size={18} />}
        </button>
      </form>
      <div className="ask__chips">
        {t.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            disabled={busy}
            onClick={() => {
              setQ(s);
              void ask(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div aria-live="polite">
        {error && <p className="error">{t.errors[error]}</p>}
        {answer && <p className="ask__answer">{answer}</p>}
      </div>
    </section>
  );
}
