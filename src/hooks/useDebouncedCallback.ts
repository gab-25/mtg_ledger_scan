import { useEffect, useMemo, useRef } from "react";

export type Debounced<A extends unknown[]> = ((...args: A) => void) & {
  /** Drops the pending call, if any. */
  cancel: () => void;
};

/**
 * `fn` delayed until the calls pause for `ms`: each call restarts the wait, and only the last one runs, with its
 * arguments. It runs the latest `fn` passed (no stale closures), the returned function stays the same across
 * renders, and a call still pending on unmount is dropped.
 */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms: number): Debounced<A> {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return useMemo(() => {
    const cancel = () => clearTimeout(timer.current);
    const debounced = (...args: A) => {
      cancel();
      timer.current = setTimeout(() => latest.current(...args), ms);
    };
    return Object.assign(debounced, { cancel });
  }, [ms]);
}
