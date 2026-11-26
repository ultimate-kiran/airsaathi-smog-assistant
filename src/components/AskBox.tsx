"use client";

import { useId, useState } from "react";
import { useLatestRequest } from "./hooks/useLatestRequest";
import { api, clientErrorCode, isAbort } from "@/lib/client/api";
import { UI } from "@/lib/i18n";
import { QUESTION_LENGTH, type ErrorCode, type Profile } from "@/lib/types";
import Icon from "./Icon";

/** Mount with key={lang}: a language switch starts a fresh box, so no answer shows in the old language. */
export default function AskBox({ profile }: { profile: Profile }) {
  const t = UI[profile.lang];
  const id = useId();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<ErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const startRequest = useLatestRequest();

  async function ask(question: string) {
    const text = question.trim();
    if (text.length < QUESTION_LENGTH.min || busy) return;
    const signal = startRequest();
    setBusy(true);
    setError(null);
    setAnswer("");
    try {
      const reply = await api.ask(text, profile, signal);
      if (!signal.aborted) setAnswer(reply.answer);
    } catch (e) {
      if (signal.aborted || isAbort(e)) return;
      setError(clientErrorCode(e));
    } finally {
      if (!signal.aborted) setBusy(false);
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
        <input
          id={id}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.askPlaceholder}
          maxLength={QUESTION_LENGTH.max}
        />
        <button className="btn btn--primary" type="submit" disabled={busy || q.trim().length < QUESTION_LENGTH.min}>
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
