import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getSetup, startSession } from "../api/scan";
import type { Setup } from "../api/types";
import Header from "../components/Header";
import { isPhone } from "../device";

export default function StartScreen() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [expansion, setExpansion] = useState("");
  const [condition, setCondition] = useState("NM");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const phone = isPhone();

  useEffect(() => {
    getSetup()
      .then((s) => {
        setSetup(s);
        setExpansion(s.defaults.expansion_id === null ? "" : String(s.defaults.expansion_id));
        setCondition(s.defaults.condition);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { session } = await startSession(expansion ? Number(expansion) : null, condition);
      navigate(`/scan/${session.uuid}/`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="main app-main">
      <Header eyebrow="Collection" title="Scan cards" />
      {error && <p className="scan-warn" role="alert">{error}</p>}
      {setup && (setup.missing.length > 0 || setup.warnings.length > 0) && (
        <div className="scan-warnings">
          {setup.missing.map((m) => (
            <p className="scan-warn" role="alert" key={m.url}>
              {m.message} <a href={m.url}>Connect it in Profile and settings</a>.
            </p>
          ))}
          {setup.warnings.map((w) => (
            <p className="scan-warn" key={w}>{w}</p>
          ))}
        </div>
      )}
      {setup && (
        <div className="scan-start">
          <form className="scan-panel" onSubmit={submit}>
            <div className="field">
              <label htmlFor="expansion">Expansion</label>
              <select id="expansion" className="input" value={expansion} onChange={(e) => setExpansion(e.target.value)}>
                <option value="">All expansions</option>
                {setup.expansions.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.code.toUpperCase()} · {x.name}
                  </option>
                ))}
              </select>
              <p className="hint">Locking one expansion makes recognition faster and more accurate.</p>
            </div>

            <fieldset className="scan-box">
              <legend className="eyebrow">Defaults</legend>
              <span className="scan-label">Condition</span>
              <div className="chips">
                {setup.conditions.map((c) => (
                  <label className="chip" key={c.code}>
                    <input
                      type="radio"
                      name="condition"
                      value={c.code}
                      aria-label={c.code}
                      checked={condition === c.code}
                      onChange={() => setCondition(c.code)}
                    />
                    <span title={c.label}>{c.code}</span>
                  </label>
                ))}
              </div>
              <p className="hint">Applies to every card in the session. Language and foil are read from each card.</p>
            </fieldset>

            <button type="submit" className="btn btn-primary btn-wide" disabled={busy}>
              {phone ? "Open camera" : "Start and continue on phone"}
            </button>
            {!phone && (
              <p className="hint" style={{ textAlign: "center" }}>
                Scanning needs a smartphone camera: the next page shows a QR code to open this session on your phone.
              </p>
            )}
            <p className="hint" style={{ textAlign: "center" }}>Cards stay in a draft until you save them.</p>
          </form>
        </div>
      )}
    </main>
  );
}
