// When to shoot: a pure state machine fed with frame measurements and UI events.
//
//   armed --(card, sharp, still)--> steadying --(held for STEADY_MS)--> busy [capture] --(result)--> armed
//   steadying --(lost)--> armed
//
// After a shot the same scene must not be shot again, so `needChange` is set: a frame is only ready once it
// differs from the shot (`changed`, measured by the caller against the photo). This works on any surface,
// including a patterned mat that never looks empty, and lets the next card be laid on top of the last one.
// A box empty for EMPTY_MS clears needChange, so a second copy of the same card can be shot in the same spot.
//
//   manual (the Retry button): armed/steadying --> busy [capture]
//   pause: any --> paused --(resume)--> armed, needing a change (the card that was being confirmed is still there)
import { EMPTY_MS, STEADY_MS } from "./config";

export type Phase = "armed" | "steadying" | "busy" | "paused";

export type AutoscanState = {
  phase: Phase;
  /** When the current steadying started (ms). */
  since: number;
  /** Start of the current run of empty frames (ms), or null. */
  emptySince: number | null;
  /** The scene was just shot: only a frame that differs from it may be shot. */
  needChange: boolean;
};

export type AutoscanEvent =
  | { type: "frame"; t: number; present: boolean; sharp: boolean; still: boolean; changed: boolean }
  | { type: "manual" }
  | { type: "result" }
  | { type: "pause" }
  | { type: "resume" };

export function initialState(): AutoscanState {
  return { phase: "armed", since: 0, emptySince: null, needChange: false };
}

const idle = (s: AutoscanState) => ({ state: s, capture: false });
const shot = (s: AutoscanState) => ({ state: { ...s, phase: "busy" as const, emptySince: null, needChange: true }, capture: true });

export function step(s: AutoscanState, e: AutoscanEvent): { state: AutoscanState; capture: boolean } {
  switch (e.type) {
    case "pause":
      return idle({ ...s, phase: "paused" });
    case "resume":
      return s.phase === "paused" ? idle({ ...s, phase: "armed", emptySince: null, needChange: true }) : idle(s);
    case "result":
      return s.phase === "busy" ? idle({ ...s, phase: "armed" }) : idle(s);
    case "manual":
      return s.phase === "busy" || s.phase === "paused" ? idle(s) : shot(s);
    case "frame": {
      if (s.phase === "paused") return idle(s);
      const emptySince = e.present ? null : (s.emptySince ?? e.t);
      const needChange = s.needChange && !(emptySince !== null && e.t - emptySince >= EMPTY_MS);
      const next = { ...s, emptySince, needChange };
      const ready = e.present && e.sharp && e.still && (!needChange || e.changed);
      switch (s.phase) {
        case "busy":
          return idle(next);
        case "armed":
          return idle(ready ? { ...next, phase: "steadying", since: e.t } : next);
        case "steadying":
          if (!ready) return idle({ ...next, phase: "armed" });
          return e.t - s.since >= STEADY_MS ? shot(next) : idle(next);
      }
    }
  }
}
