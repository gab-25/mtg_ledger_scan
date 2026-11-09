import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { cropToGuide } from "../camera/crop";
import { measure, toGray, type Gray, type Metrics } from "./analyze";
import { ANALYSIS_FPS, ANALYSIS_WIDTH } from "./config";
import { initialState, step, type AutoscanEvent, type Phase } from "./machine";

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>;
  guideRef: RefObject<HTMLElement | null>;
  /** Auto-shoot on; when off only manual() shoots. */
  enabled: boolean;
  /** A panel covers the camera: no shots; afterwards wait for an empty box. */
  paused: boolean;
  onCapture: () => void | Promise<void>;
  /** Publish the live metrics (for the ?debug=1 overlay). */
  debug: boolean;
};

/** Watches the guide region and calls onCapture when the machine says so (see machine.ts). */
export function useAutoscan({ videoRef, guideRef, enabled, paused, onCapture, debug }: Options) {
  const state = useRef(initialState(enabled));
  const onCaptureRef = useRef(onCapture);
  onCaptureRef.current = onCapture;
  const [phase, setPhase] = useState<Phase>(state.current.phase);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const send = useCallback((event: AutoscanEvent) => {
    const r = step(state.current, event);
    state.current = r.state;
    setPhase(r.state.phase);
    if (r.capture) void onCaptureRef.current();
  }, []);

  useEffect(() => send({ type: "enable", enabled }), [enabled, send]);
  useEffect(() => send({ type: paused ? "pause" : "resume" }), [paused, send]);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    let prev: Gray | null = null;
    let wasPresent = false;
    const timer = setInterval(() => {
      const video = videoRef.current;
      const guide = guideRef.current;
      if (!video || !guide || video.readyState < 2 || !video.videoWidth) return;
      if (state.current.phase === "paused") return;
      cropToGuide(video, guide, ANALYSIS_WIDTH, canvas);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const gray = toGray(ctx.getImageData(0, 0, canvas.width, canvas.height));
      const m = measure(gray, prev, wasPresent);
      prev = gray;
      wasPresent = m.present;
      if (debug) setMetrics(m);
      send({ type: "frame", t: performance.now(), present: m.present, sharp: m.sharp, still: m.still });
    }, 1000 / ANALYSIS_FPS);
    return () => clearInterval(timer);
  }, [videoRef, guideRef, debug, send]);

  const manual = useCallback(() => send({ type: "manual" }), [send]);
  /** The capture finished; noCard: the server saw no card in the photo. */
  const done = useCallback((noCard = false) => send({ type: "result", noCard }), [send]);
  return { phase, metrics, manual, done };
}
