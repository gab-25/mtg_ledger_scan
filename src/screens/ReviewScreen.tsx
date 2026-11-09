import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getReview, getSetup, saveSession, setThreshold, undoLine, updateLine } from "../api/scan";
import type { Line, LineChanges, Review, Setup } from "../api/types";
import CardPicker from "../components/CardPicker";
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
  const [threshold, setThresholdText] = useState("");
  const [confirming, setConfirming] = useState<Line | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => getReview(uuid).then(setReview), [uuid]);

  useEffect(() => {
    Promise.all([getReview(uuid), getSetup()])
      .then(([r, s]) => {
        setReview(r);
        setSetup(s);
        setThresholdText(r.session.sale_threshold ?? "");
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

  async function applyThreshold(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      setReview(await setThreshold(uuid, threshold));
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
      <main className="main app-main">
        {error ? <p className="scan-warn" role="alert">{error}</p> : <p className="empty">Loading…</p>}
      </main>
    );
  }

  const { session, lines, pending, copies, unique, listed } = review;
  const camera = `/scan/${uuid}`;
  return (
    <main className="main app-main">
      <Header
        eyebrow={`Session · ${sessionLabel(session)}`}
        title={`${plural(copies, "card")} to save`}
        actions={<Link className="btn" to={camera}>Continue scanning</Link>}
      />
      <div className="sub">{unique} unique · duplicates already merged</div>

      {error && <p className="scan-warn" role="alert">{error}</p>}
      {pending.length > 0 && (
        <button type="button" className="scan-warn scan-warn-button" onClick={() => setConfirming(pending[0])}>
          {plural(pending.length, "card")} to confirm — saving is blocked until they are resolved or removed
        </button>
      )}

      <form className="scan-threshold" onSubmit={applyThreshold}>
        <label htmlFor="threshold">List for sale cards worth more than €</label>
        <input
          id="threshold"
          inputMode="decimal"
          className="input mono"
          placeholder="—"
          value={threshold}
          onChange={(e) => setThresholdText(e.target.value)}
        />
        <button type="submit" className="btn btn-sm">Apply</button>
      </form>

      <div className="scan-list">
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
        {lines.length === 0 && <p className="empty">No cards scanned yet.</p>}
        {pending.map((l) => (
          <div className="scan-line scan-line-pending" key={l.uuid}>
            {l.frame_url ? <img src={l.frame_url} alt="" /> : <span className="scan-thumb" aria-hidden="true" />}
            <div className="scan-line-text">
              <span className="scan-option-name">Unconfirmed card</span>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirming(l)}>Confirm</button>
            </div>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => act(() => updateLine(l.uuid, { quantity: 0 }))}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="scan-save">
        <Link className="btn" to={camera}>Continue</Link>
        <button type="button" className="btn btn-primary" disabled={busy || pending.length > 0 || lines.length === 0} onClick={save}>
          {`Save ${copies}${listed ? ` · list ${listed}` : ""}`}
        </button>
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
