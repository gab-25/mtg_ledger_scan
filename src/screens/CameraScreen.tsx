import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { capture, getSession, getSetup, isNetworkError, undoLine, updateLine } from "../api/scan";
import type { Line, LineResult, Session, Setup } from "../api/types";
import { useAutoscan, type ScanPhase } from "../autoscan/useAutoscan";
import { cropToGuide, toJpeg } from "../camera/crop";
import { useCamera } from "../camera/useCamera";
import CardPicker from "../components/CardPicker";
import LastCardToast, { type Toast } from "../components/LastCardToast";
import PhoneOnly, { sessionLabel } from "./PhoneOnly";
import { Button } from "@/components/ui/button";
import { APP_MAIN, EMPTY, SCAN_WARN, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";

const PILL = "inline-flex min-h-9 items-center gap-1.5 rounded-full bg-card px-3 text-[13px]";
/** The card-shaped frame over the video; its border shows the autoscan phase (data-phase). */
const GUIDE = [
  "relative flex aspect-[63/88] w-[min(88cqw,calc(78cqh*63/88))] items-center justify-center rounded-xl",
  "border-2 border-[rgba(236,232,223,.7)] shadow-[0_0_0_100vmax_rgba(10,10,13,.55)] transition-[border-color,box-shadow] duration-150",
  "data-[phase=next]:border-dashed data-[phase=next]:border-muted-foreground",
  "data-[phase=steadying]:border-primary data-[phase=steadying]:shadow-[0_0_0_4px_var(--color-gold-bg)]",
  "data-[phase=busy]:border-dashed data-[phase=busy]:border-primary",
].join(" ");

const HELP: Record<ScanPhase, string> = {
  armed: "Frame the whole card",
  next: "Put the next card",
  steadying: "Hold still…",
  busy: "Recognising…",
  paused: "Frame the whole card",
};

function addedState(line: Line) {
  return `Added · ${line.quantity} ${line.quantity === 1 ? "copy" : "copies"}`;
}

type Picker = { line: Line | null } | null;

type CameraProps = {
  session: Session;
  setup: Setup;
  count: number;
  setCount: (n: number) => void;
  toast: Toast | null;
  setToast: (t: Toast | null) => void;
  picker: Picker;
  setPicker: (p: Picker) => void;
};

function PhoneCamera({ session, count, setCount, toast, setToast, picker, setPicker }: CameraProps) {
  const { videoRef, error } = useCamera();
  const guideRef = useRef<HTMLDivElement | null>(null);
  const [capturing, setCapturing] = useState(false);
  const busy = useRef(false);
  /** An upload that failed for lack of network: the next shot resends it (same photo, same id) instead. */
  const failed = useRef<{ frame: Blob; captureId: string } | null>(null);
  const doneRef = useRef<(noCard: boolean) => void>(() => {});
  const debug = useSearchParams()[0].get("debug") === "1";

  const shoot = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    let noCard = false;
    setCapturing(true);
    try {
      let shot = failed.current;
      if (!shot) {
        const video = videoRef.current;
        const guide = guideRef.current;
        const frame = await toJpeg(video && guide ? cropToGuide(video, guide) : document.createElement("canvas"));
        navigator.vibrate?.(30);
        shot = { frame, captureId: crypto.randomUUID() };
      }
      failed.current = shot;
      const r = await capture(session.uuid, shot.frame, shot.captureId);
      failed.current = null;
      setCount(r.count);
      if (r.result === "confirm" && r.line) {
        setToast(null);
        setPicker({ line: r.line });
      } else if (r.result === "added" || r.result === "handled") {
        setToast({ state: r.message, line: r.line });
      } else {
        noCard = r.result === "no_card";
        setToast({ state: r.message, line: null, error: noCard });
      }
    } catch (err) {
      if (isNetworkError(err) && failed.current) {
        setToast({ state: "No connection — retry to send the same photo", line: null, error: true, retry: true });
        return;
      }
      failed.current = null;
      if (err instanceof ApiError) setToast({ state: err.message, line: null, error: true, helpUrl: err.helpUrl });
      else setToast({ state: (err as Error).message, line: null, error: true });
    } finally {
      busy.current = false;
      setCapturing(false);
      doneRef.current(noCard);
    }
  }, [session.uuid, setCount, setToast, setPicker, videoRef]);

  const auto = useAutoscan({ videoRef, guideRef, paused: picker !== null, onCapture: shoot, debug });
  doneRef.current = auto.done;

  async function onFoil() {
    const line = toast?.line;
    if (!line) return;
    try {
      const r = await updateLine(line.uuid, { foil: !line.foil });
      setCount(r.count);
      setToast({ ...toast, line: r.line });
    } catch (err) {
      setToast({ state: (err as Error).message, line: null, error: true });
    }
  }

  async function onUndo() {
    const line = toast?.line;
    if (!line) return;
    try {
      const r = await undoLine(line.uuid);
      setCount(r.count);
      setToast(r.line ? { state: "Removed one copy", line: r.line } : { state: "Removed", line: null });
    } catch (err) {
      setToast({ state: (err as Error).message, line: null, error: true });
    }
  }


  const review = `/scan/${session.uuid}/review`;
  return (
    <main className="flex h-dvh flex-col overscroll-none bg-[#0A0A0D] text-foreground">
      <div className="flex items-center gap-2 p-4">
        <Link className="flex size-11 items-center justify-center rounded-full bg-card text-foreground hover:text-foreground" to={review} aria-label="Close and review">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
        <span className={PILL}>{sessionLabel(session)}</span>
        <span className={cn(PILL, "ml-auto")}>
          <span className="font-mono" data-testid="count">{count}</span> <span className={SUB}>cards</span>
        </span>
      </div>

      {/* size containment: the guide is as large as the stage allows, leaving room below for the help line */}
      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 overflow-hidden @container-size">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />
        <div ref={guideRef} className={GUIDE} data-phase={auto.phase} />
        <p className="relative m-0 px-4 text-center text-[13px] text-text-3">{error ?? HELP[auto.phase]}</p>
        {debug && auto.metrics && (
          <pre className="absolute top-2 left-2 m-0 rounded-lg bg-black/65 p-2 font-mono text-xs leading-[1.4] text-white" data-testid="debug">
            {`${auto.phase}\nedges ${auto.metrics.edges.toFixed(3)} ${auto.metrics.present ? "card" : "empty"}\n` +
              `sharp ${auto.metrics.sharpness.toFixed(2)} ${auto.metrics.sharp ? "ok" : "blur"} ` +
              `(${auto.metrics.sharpRange.map((x) => x.toFixed(2)).join("–")})\n` +
              `motion ${auto.metrics.motion.toFixed(1)} ${auto.metrics.still ? "still" : "moving"} ` +
              `(${auto.metrics.motionRange.map((x) => x.toFixed(1)).join("–")})\n` +
              `change ${auto.metrics.change.toFixed(1)} bg ${auto.metrics.fromBackground.toFixed(1)}`}
          </pre>
        )}
      </div>

      <LastCardToast toast={toast} onFoil={onFoil} onUndo={onUndo} onRetry={auto.manual} />

      <div className="flex items-center justify-between gap-2 px-5 pt-2 pb-[max(24px,env(safe-area-inset-bottom))]">
        <Button type="button" disabled={capturing} onClick={() => setPicker({ line: null })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          Search
        </Button>
        <Button asChild variant="primary"><Link to={review}>Review</Link></Button>
      </div>
    </main>
  );
}

export default function CameraScreen() {
  const { uuid = "" } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [picker, setPicker] = useState<Picker>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getSession(uuid), getSetup()])
      .then(([{ session: s }, st]) => {
        if (s.status === "saved") return void navigate("/");
        setSession(s);
        setSetup(st);
        setCount(s.count);
        if (s.last_line) setToast({ state: "Last added", line: s.last_line });
      })
      .catch((e: Error) => setError(e.message));
  }, [uuid, navigate]);

  function pickerDone(r: LineResult) {
    setCount(r.count);
    if (r.line) setToast({ state: addedState(r.line), line: r.line });
    setPicker(null);
  }

  if (error) return <main className={APP_MAIN}><p className={SCAN_WARN} role="alert">{error}</p></main>;
  if (!session || !setup) return <main className={APP_MAIN}><p className={EMPTY}>Loading…</p></main>;

  const props = { session, setup, count, setCount, toast, setToast, picker, setPicker };
  return (
    <>
      {session.is_phone ? (
        <PhoneCamera {...props} />
      ) : (
        <PhoneOnly session={{ ...session, count }} onSearch={() => setPicker({ line: null })} />
      )}
      {picker && (
        <CardPicker
          key={picker.line?.uuid ?? "search"}
          sessionUuid={session.uuid}
          line={picker.line}
          setup={setup}
          defaultSet={session.expansion?.code}
          onDone={pickerDone}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
