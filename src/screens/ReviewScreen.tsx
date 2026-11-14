import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getReview, getSetup, saveSession, undoLine, updateLine } from "../api/scan";
import type { Line, LineChanges, Review, Setup } from "../api/types";
import CardPicker from "../components/CardPicker";
import { Button } from "@/components/ui/button";
import { APP_MAIN, EMPTY, SCAN_LINE, SCAN_LINE_TEXT, SCAN_WARN, SUB, THUMB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import Header from "../components/Header";
import LineRow from "../components/LineRow";
import { useNotify } from "../notifications";
import { sessionLabel } from "./PhoneOnly";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default function ReviewScreen() {
  const { uuid = "" } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const [review, setReview] = useState<Review | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [confirming, setConfirming] = useState<Line | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => getReview(uuid).then(setReview), [uuid]);

  useEffect(() => {
    Promise.all([getReview(uuid), getSetup()])
      .then(([r, s]) => {
        setReview(r);
        setSetup(s);
      })
      .catch((e: Error) => setError(e.message));
  }, [uuid]);

  // Every edit can merge or split lines on the server: reload the whole review after it.
  async function act(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const r = await saveSession(uuid);
      notify(r.messages, { afterNavigation: true });
      navigate(r.redirect);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!review || !setup) {
    return (
      <main className={APP_MAIN}>
        {error ? <p className={SCAN_WARN} role="alert">{error}</p> : <p className={EMPTY}>Loading…</p>}
      </main>
    );
  }

  const { session, lines, pending, copies, unique } = review;
  const camera = `/scan/${uuid}`;
  return (
    <main className={APP_MAIN}>
      <Header
        eyebrow={`Session · ${sessionLabel(session)}`}
        title={`${plural(copies, "card")} to save`}
        actions={<Button asChild><Link to={camera}>Continue scanning</Link></Button>}
      />
      <div className={SUB}>{unique} unique · duplicates already merged</div>

      {error && <p className={SCAN_WARN} role="alert">{error}</p>}
      {pending.length > 0 && (
        <button type="button" className={cn(SCAN_WARN, "w-full cursor-pointer border-0 text-left font-sans hover:underline")}
          onClick={() => setConfirming(pending[0])}>
          {plural(pending.length, "card")} to confirm — saving is blocked until they are resolved or removed
        </button>
      )}

      <div className="flex flex-col">
        {lines.map((l) => (
          <LineRow
            key={`${l.uuid}-${l.condition}-${l.language}-${l.foil}`}
            line={l}
            conditions={setup.conditions}
            languages={setup.languages}
            onChange={(changes: LineChanges) => act(() => updateLine(l.uuid, changes))}
            onUndo={() => act(() => undoLine(l.uuid))}
          />
        ))}
        {lines.length === 0 && <p className={EMPTY}>No cards scanned yet.</p>}
        {pending.map((l) => (
          <div className={SCAN_LINE} key={l.uuid}>
            {l.frame_url ? <img className={THUMB} src={l.frame_url} alt="" /> : <span className={THUMB} aria-hidden="true" />}
            <div className={SCAN_LINE_TEXT}>
              <span className="text-[15px] font-semibold text-warn">Unconfirmed card</span>
              <Button type="button" size="sm" variant="ghost" className="self-start" onClick={() => setConfirming(l)}>Confirm</Button>
            </div>
            <Button type="button" size="sm" variant="danger" onClick={() => act(() => updateLine(l.uuid, { quantity: 0 }))}>
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-line bg-background py-3">
        <Button asChild><Link to={camera}>Continue</Link></Button>
        <Button type="button" variant="primary" className="min-h-[52px] flex-1" disabled={busy || pending.length > 0 || lines.length === 0} onClick={save}>
          {`Save ${copies}`}
        </Button>
      </div>

      {confirming && (
        <CardPicker
          sessionUuid={uuid}
          line={confirming}
          setup={setup}
          defaultSet={session.expansion?.code}
          onDone={() => {
            setConfirming(null);
            void act(async () => {});
          }}
          onClose={() => setConfirming(null)}
        />
      )}
    </main>
  );
}
