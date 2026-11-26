import { useCallback, useEffect, useRef } from "react";

/** A new request or an unmount cancels work owned by the previous caller. */
export function useLatestRequest() {
  const current = useRef<AbortController | null>(null);
  useEffect(() => () => current.current?.abort(), []);

  return useCallback(() => {
    current.current?.abort();
    current.current = new AbortController();
    return current.current.signal;
  }, []);
}
