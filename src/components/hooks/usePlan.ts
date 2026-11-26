"use client";

import { useCallback, useState } from "react";
import { useLatestRequest } from "./useLatestRequest";
import { ClientError, api, clientErrorCode, isAbort } from "@/lib/client/api";
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
  const startRequest = useLatestRequest();

  const load = useCallback(async function run(profile: Profile, attempt = 0): Promise<boolean> {
    if (!profile.place) return false;
    const signal = startRequest();
    setStatus("loading");
    setError(null);
    let base: PlanView;
    try {
      base = await api.plan(profile, signal);
    } catch (e) {
      if (signal.aborted || isAbort(e)) return false;
      setError(clientErrorCode(e));
      setStatus("error");
      return false;
    }
    if (signal.aborted) return false;
    setPlan(base);
    setStatus("idle");
    setAiStatus(base.aiEnabled ? "pending" : "off");
    if (base.aiEnabled) {
      api
        .explain(profile, base.fetchedAt, signal)
        .then((ai) => {
          if (signal.aborted) return;
          setPlan((current) => (current === base ? withAi(base, ai) : current));
          setAiStatus("done");
        })
        .catch((e) => {
          if (signal.aborted || isAbort(e)) return;
          // The air reading moved on between the two calls: reload once so text and numbers match.
          if (e instanceof ClientError && e.code === "stale" && attempt === 0) void run(profile, 1);
          else setAiStatus("failed");
        });
    }
    return true;
  }, [startRequest]);

  return { plan, status, error, aiStatus, load };
}
