"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClientError, api, isAbort } from "@/lib/client/api";
import { withAi } from "@/lib/planText";
import type { ErrorCode, PlanView, Profile } from "@/lib/types";

export type PlanStatus = "idle" | "loading" | "error";
export type AiStatus = "off" | "pending" | "done" | "failed";

/**
 * Loads a plan in two steps: the rule-based plan as soon as the air data is in, then the AI
 * explanation, merged in when it arrives. A newer request cancels any older one.
 */
export function usePlan() {
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [status, setStatus] = useState<PlanStatus>("idle");
  const [error, setError] = useState<ErrorCode | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>("off");
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => () => ctl.current?.abort(), []);

  const load = useCallback(async (profile: Profile): Promise<boolean> => {
    if (!profile.place) return false;
    ctl.current?.abort();
    const c = new AbortController();
    ctl.current = c;
    setStatus("loading");
    setError(null);
    let base: PlanView;
    try {
      base = await api.plan(profile, c.signal);
    } catch (e) {
      if (isAbort(e)) return false;
      setError(e instanceof ClientError ? e.code : "network");
      setStatus("error");
      return false;
    }
    setPlan(base);
    setStatus("idle");
    setAiStatus(base.aiEnabled ? "pending" : "off");
    if (base.aiEnabled) {
      api
        .explain(profile, c.signal)
        .then((ai) => {
          setPlan((current) => (current === base ? withAi(base, ai) : current));
          setAiStatus("done");
        })
        .catch((e) => {
          if (!isAbort(e)) setAiStatus("failed");
        });
    }
    return true;
  }, []);

  return { plan, status, error, aiStatus, load };
}
