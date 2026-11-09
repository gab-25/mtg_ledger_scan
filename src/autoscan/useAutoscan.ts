import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { cropToGuide } from "../camera/crop";
import { alignedDiff, measure, toGray, type Gray, type Metrics } from "./analyze";
import { ANALYSIS_FPS, ANALYSIS_WIDTH, CHANGE_MIN } from "./config";
import { initialState, step, type AutoscanEvent, type AutoscanState } from "./machine";

/** What the camera screen shows: "next" is armed right after a shot, waiting for another card. */
export type ScanPhase = "next" | AutoscanState["phase"];

export type ScanMetrics = Metrics & {
  /** Difference from the last photo (Infinity before the first). */
  change: number;
  /** Difference from the learned empty background (Infinity until a photo came back without a card). */
  fromBackground: number;
  /** Min and max over the last 2 s, to tune the thresholds from a single screenshot. */
  sharpRange: [number, number];
  motionRange: [number, number];
};

const range = (xs: number[]): [number, number] => [Math.min(...xs), Math.max(...xs)];

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  guideRef: RefObject<HTMLElement | null>;
  /** A panel covers the camera: no shots; afterwards wait for a different card. */
  paused: boolean;
  onCapture: () => void | Promise<void>;
  /** Publish the live metrics (for the ?debug=1 overlay). */
  debug: boolean;
};

const shown = (s: AutoscanState): ScanPhase => (s.phase === "armed" && s.needChange ? "next" : s.phase);

/** Watches the guide region and calls onCapture when the machine says so (see machine.ts). */
export function useAutoscan({ videoRef, guideRef, paused, onCapture, debug }: Options) {
  const state = useRef(initialState());
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const [phase, setPhase] = useState<ScanPhase>(shown(state.current));
  const [metrics, setMetrics] = useState<ScanMetrics | null>(null);
  /** Latest analysed frame; the frame of the last photo; the empty box (a photo the server found no card in). */
  const latest = useRef<Gray | null>(null);
  const lastShot = useRef<Gray | null>(null);
  const background = useRef<Gray | null>(null);

  const send = useCallback((event: AutoscanEvent) => {
    const r = step(state.current, event);
    // The scene that must change before the next shot: the one just shot, or the one under the panel that closed.
    const resumed = event.type === "resume" && state.current.phase === "paused";
    if (r.capture || resumed) lastShot.current = latest.current;
    state.current = r.state;
    setPhase(shown(r.state));
    if (r.capture) void onCaptureRef.current();
  }, []);

  useEffect(() => send({ type: paused ? "pause" : "resume" }), [paused, send]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    let wasPresent = false;
    const recent: Metrics[] = [];
    const timer = setInterval(() => {
      const video = videoRef.current;
      const guide = guideRef.current;
      if (!video || !guide || video.readyState < 2 || !video.videoWidth) return;
      if (state.current.phase === "paused") return;
      cropToGuide(video, guide, ANALYSIS_WIDTH, canvas);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const gray = toGray(ctx.getImageData(0, 0, canvas.width, canvas.height));
      const m = measure(gray, latest.current, wasPresent);
      latest.current = gray;
      const fromBackground = alignedDiff(gray, background.current);
      const change = alignedDiff(gray, lastShot.current);
      // Edges alone can't tell a patterned mat from a card: the learned background is empty whatever its edges.
      const present = m.present && fromBackground > CHANGE_MIN;
      wasPresent = present;
      if (debug) {
        recent.push(m);
        if (recent.length > 2 * ANALYSIS_FPS) recent.shift();
        const sharpRange = range(recent.map((r) => r.sharpness));
        const motionRange = range(recent.map((r) => r.motion).filter(Number.isFinite));
        setMetrics({ ...m, present, change, fromBackground, sharpRange, motionRange });
      }
      send({ type: "frame", t: performance.now(), present, sharp: m.sharp, still: m.still, changed: change > CHANGE_MIN });
    }, 1000 / ANALYSIS_FPS);
    return () => clearInterval(timer);
  }, [videoRef, guideRef, debug, send]);

  /** Shoot now (the Retry button). */
  const manual = useCallback(() => send({ type: "manual" }), [send]);
  /** The capture finished; noCard: the server saw no card in the photo, which then is the empty background. */
  const done = useCallback(
    (noCard = false) => {
      if (noCard && lastShot.current) background.current = lastShot.current;
      send({ type: "result" });
    },
    [send],
  );
  return { phase, metrics, manual, done };
}
