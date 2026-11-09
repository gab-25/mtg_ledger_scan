// When to shoot: a pure state machine fed with frame measurements and UI events.
//
//   waitEmpty --(box empty for EMPTY_MS)--> armed --(card, sharp, still)--> steadying
//   steadying --(held for STEADY_MS)--> busy [capture]      steadying --(lost)--> armed
//   busy --(result)--> armed if the box was emptied meanwhile, else waitEmpty
//   busy --(result, no card)--> waitEmpty, re-arming only after the scene moved (no loop of shots at an empty box)
//   manual: waitEmpty/armed/steadying --> busy [capture]     pause: any --> paused --(resume)--> waitEmpty
import { EMPTY_MS, STEADY_MS } from "./config";

export type Phase = "waitEmpty" | "armed" | "steadying" | "busy" | "paused";

export type AutoscanState = {
  phase: Phase;
  /** When the current steadying started (ms). */
  since: number;
  /** Start of the current run of empty frames (ms), or null. */
  emptySince: number | null;
  /** While busy: the box has been empty for EMPTY_MS, so the next card may be shot right after the result. */
  sawEmpty: boolean;
  /** After a "no card" result: wait for a moving frame before the box may re-arm. */
  needChange: boolean;
  enabled: boolean;
};

export type AutoscanEvent =
  | { type: "frame"; t: number; present: boolean; sharp: boolean; still: boolean }
  | { type: "manual" }
  | { type: "result"; noCard?: boolean }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "enable"; enabled: boolean };

export function initialState(enabled: boolean): AutoscanState {
  return { phase: "waitEmpty", since: 0, emptySince: null, sawEmpty: false, needChange: false, enabled };
}

const idle = (s: AutoscanState) => ({ state: s, capture: false });

/** Track runs of empty frames; returns the new emptySince and whether the box has now been empty long enough. */
function emptiness(s: AutoscanState, t: number, present: boolean): [number | null, boolean] {
  if (present) return [null, false];
  const since = s.emptySince ?? t;
  return [since, t - since >= EMPTY_MS];
}

export function step(s: AutoscanState, e: AutoscanEvent): { state: AutoscanState; capture: boolean } {
  switch (e.type) {
    case "enable":
      return idle({ ...s, enabled: e.enabled });
    case "pause":
      return idle({ ...s, phase: "paused" });
    case "resume":
      return s.phase === "paused" ? idle({ ...s, phase: "waitEmpty", emptySince: null, sawEmpty: false }) : idle(s);
    case "result":
      if (s.phase !== "busy") return idle(s);
      if (e.noCard) return idle({ ...s, phase: "waitEmpty", emptySince: null, sawEmpty: false, needChange: true });
      return idle({ ...s, phase: s.sawEmpty ? "armed" : "waitEmpty", sawEmpty: false });
    case "manual":
      if (s.phase === "busy" || s.phase === "paused") return idle(s);
      return { state: { ...s, phase: "busy", emptySince: null, sawEmpty: false }, capture: true };
    case "frame": {
      const [emptySince, longEmpty] = emptiness(s, e.t, e.present);
      const ready = e.present && e.sharp && e.still;
      switch (s.phase) {
        case "paused":
          return idle(s);
        case "waitEmpty": {
          const needChange = s.needChange && e.still;
          if (needChange) return idle({ ...s, emptySince: null });
          return idle({ ...s, emptySince, needChange, phase: longEmpty ? "armed" : "waitEmpty" });
        }
        case "busy":
          return idle({ ...s, emptySince, sawEmpty: s.sawEmpty || longEmpty });
        case "armed":
          if (ready && s.enabled) return idle({ ...s, emptySince, phase: "steadying", since: e.t });
          return idle({ ...s, emptySince });
        case "steadying":
          if (!ready || !s.enabled) return idle({ ...s, emptySince, phase: "armed" });
          if (e.t - s.since >= STEADY_MS) {
            return { state: { ...s, phase: "busy", emptySince: null, sawEmpty: false }, capture: true };
          }
          return idle({ ...s, emptySince });
      }
    }
  }
}
