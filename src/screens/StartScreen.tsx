import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { getSetup, startSession } from "../api/scan";
import type { Setup } from "../api/types";
import Field from "../components/Field";
import Header from "../components/Header";
import { Button } from "@/components/ui/button";
import { RadioChip, RadioGroup } from "@/components/ui/radio-group";
import { ALL, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_MAIN, EYEBROW, HINT, SCAN_BOX, SCAN_PANEL, SCAN_WARN } from "@/lib/styles";
import { cn } from "@/lib/utils";
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
    <main className={APP_MAIN}>
      <Header eyebrow="Collection" title="Scan cards" />
      {error && <p className={SCAN_WARN} role="alert">{error}</p>}
      {setup && (setup.missing.length > 0 || setup.warnings.length > 0) && (
        <div className="flex max-w-[760px] flex-col gap-2">
          {setup.missing.map((m) => (
            <p className={SCAN_WARN} role="alert" key={m.url}>
              {m.message} <a href={m.url}>Connect it in Profile and settings</a>.
            </p>
          ))}
          {setup.warnings.map((w) => (
            <p className={SCAN_WARN} key={w}>{w}</p>
          ))}
        </div>
      )}
      {setup && (
        <div className="flex flex-wrap items-start gap-8">
          <form className={cn(SCAN_PANEL, "flex-[1_1_360px]")} onSubmit={submit}>
            <Field label="Expansion" id="expansion" help="Locking one expansion makes recognition faster and more accurate.">
              <Select value={expansion || ALL} onValueChange={(v) => setExpansion(v === ALL ? "" : v)}>
                <SelectTrigger id="expansion"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All expansions</SelectItem>
                  {setup.expansions.map((x) => (
                    <SelectItem key={x.id} value={String(x.id)}>
                      {x.code.toUpperCase()} · {x.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <fieldset className={SCAN_BOX}>
              <legend className={cn(EYEBROW, "px-1.5")}>Defaults</legend>
              <span id="condition-label" className="text-sm">Condition</span>
              <RadioGroup aria-labelledby="condition-label" className="flex flex-wrap gap-1.5" value={condition} onValueChange={setCondition}>
                {setup.conditions.map((c) => (
                  <RadioChip key={c.code} value={c.code} aria-label={c.code} title={c.label}>
                    {c.code}
                  </RadioChip>
                ))}
              </RadioGroup>
              <p className={cn(HINT, "m-0")}>Applies to every card in the session. Language and foil are read from each card.</p>
            </fieldset>

            <Button type="submit" variant="primary" size="wide" disabled={busy}>
              {phone ? "Open camera" : "Start and continue on phone"}
            </Button>
            {!phone && (
              <p className={cn(HINT, "m-0 text-center")}>
                Scanning needs a smartphone camera: the next page shows a QR code to open this session on your phone.
              </p>
            )}
            <p className={cn(HINT, "m-0 text-center")}>Cards stay in a draft until you save them.</p>
          </form>
        </div>
      )}
    </main>
  );
}
