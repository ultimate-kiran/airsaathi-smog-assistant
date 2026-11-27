"use client";

import { UI } from "@/lib/i18n";
import type { Lang, PlanView, Profile } from "@/lib/types";
import Actions from "./Actions";
import AskBox from "./AskBox";
import Header from "./Header";
import Hero from "./Hero";
import { useDoneLog } from "./hooks/useDoneLog";
import { useHousehold } from "./hooks/useHousehold";
import { usePlan, type AiStatus, type PlanStatus } from "./hooks/usePlan";
import HourStrip from "./HourStrip";
import Icon from "./Icon";
import ProfileForm from "./ProfileForm";
import ShareBar from "./ShareBar";
import Summary from "./Summary";
import Tracker from "./Tracker";

/** First visit: the three steps, until a place is chosen. */
function HowItWorks({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <section className="how" aria-labelledby="how-title">
      <h2 id="how-title">{t.stepsTitle}</h2>
      <ol className="how__list">
        {t.steps.map((s) => (
          <li key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Says who wrote the plan text: the AI model, the rules (AI off or rejected), or that AI is still writing. */
function AiNote({ plan, aiStatus, lang }: { plan: PlanView; aiStatus: AiStatus; lang: Lang }) {
  const t = UI[lang];
  let text = plan.ai.source === "ai" ? t.aiOn : t.aiOff;
  if (aiStatus === "pending") text = t.aiWriting;
  return (
    <p className="ai-note" aria-live="polite">
      <Icon name="sparkle" size={16} />
      <span>
        {text}
        {!plan.aiEnabled && ` ${t.aiOffHint}`}
      </span>
    </p>
  );
}

function PageFooter({ lang }: { lang: Lang }) {
  const t = UI[lang];
  return (
    <footer className="foot">
      <div className="foot__in">
        <p>{t.disclaimer}</p>
        <p>{t.sources}</p>
        <p>{t.privacy}</p>
      </div>
    </footer>
  );
}

interface PlanAreaProps {
  plan: PlanView;
  profile: Profile;
  status: PlanStatus;
  aiStatus: AiStatus;
  done: ReturnType<typeof useDoneLog>;
}

/** Everything below the form once a plan exists: hours, actions, progress, questions, sharing. */
function PlanArea({ plan, profile, status, aiStatus, done }: PlanAreaProps) {
  const lang = profile.lang;
  return (
    <div id="plan" className="plan" tabIndex={-1} aria-busy={status === "loading" || aiStatus === "pending"}>
      <HourStrip plan={plan} lang={lang} />
      <Actions plan={plan} lang={lang} doneIds={done.doneIds} onToggle={done.toggle} />
      <div className="duo">
        <Tracker log={done.log} lang={lang} />
        <AskBox key={lang} profile={profile} />
      </div>
      <ShareBar plan={plan} lang={lang} />
      <AiNote plan={plan} aiStatus={aiStatus} lang={lang} />
    </div>
  );
}

/** Composition only: state lives in hooks, sections in their own components. */
export default function App() {
  const { plan, status, error, aiStatus, load } = usePlan();
  const home = useHousehold(load);
  // Kept here, not in PlanArea, so the ticks survive a plan reload without flickering.
  const done = useDoneLog();
  const { profile, tailored } = home;
  const lang = profile.lang;
  const t = UI[lang];
  const hasPlace = !!profile.place;

  return (
    <div className="app" lang={lang}>
      <a className="skip" href="#results">
        {t.skip}
      </a>
      <Header lang={lang} onLang={home.setLang} />

      <main id="main">
        <Hero
          lang={lang}
          plan={plan}
          placeName={profile.place || null}
          status={status}
          error={error}
          onPick={home.pick}
          onRetry={() => void load(profile)}
        />

        <div className="wrap" id="results" tabIndex={-1}>
          {!hasPlace && <HowItWorks lang={lang} />}
          {home.formOpen && (
            <ProfileForm
              profile={profile}
              busy={status === "loading"}
              canSubmit={hasPlace}
              editing={tailored}
              onSubmit={home.build}
              onCancel={home.cancelEditing}
            />
          )}
          {tailored && hasPlace && !home.formOpen && <Summary profile={profile} onEdit={home.startEditing} />}
          {tailored && plan && (
            <PlanArea plan={plan} profile={profile} status={status} aiStatus={aiStatus} done={done} />
          )}
        </div>
      </main>

      <PageFooter lang={lang} />
    </div>
  );
}
