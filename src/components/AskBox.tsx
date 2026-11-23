"use client";

import { useId, useState } from "react";
import { UI } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

export default function AskBox({ profile, enabled }: { profile: Profile; enabled: boolean }) {
  const t = UI[profile.lang];
  const id = useId();
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(question: string) {
    const text = question.trim();
    if (text.length < 2 || busy) return;
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, profile }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong. Try again.");
      else setAnswer(data.answer);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="block ask" aria-labelledby="ask-title">
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
          maxLength={300}
          disabled={!enabled}
        />
        <button className="btn btn--primary" type="submit" disabled={!enabled || busy || q.trim().length < 2}>
          {busy ? t.asking : t.askButton}
        </button>
      </form>
      <p className="ask__chips">
        {t.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            disabled={!enabled || busy}
            onClick={() => {
              setQ(s);
              void ask(s);
            }}
          >
            {s}
          </button>
        ))}
      </p>
      <div aria-live="polite">
        {error && <p className="error">{error}</p>}
        {answer && <p className="ask__answer">{answer}</p>}
      </div>
    </section>
  );
}
