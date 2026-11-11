import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { discardSession, getSetup, listSessions, startSession } from "../api/scan";
import type { OpenSession, Setup } from "../api/types";
import Field from "../components/Field";
import Header from "../components/Header";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioChip, RadioGroup } from "@/components/ui/radio-group";
import { ALL, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_MAIN, EYEBROW, HINT, SCAN_BOX, SCAN_PANEL, SCAN_WARN } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { isPhone } from "../device";
import { naturaltime, pluralize } from "../format";
import { ScanIcon, TrashIcon } from "../components/icons";

/** /scan/ as a page (direct links, reloads): the start form under the scan header. */
export default function StartScreen() {
  return (
    <main className={APP_MAIN}>
      <Header eyebrow="Collection" title="Scan cards" />
      <ScanStartForm />
    </main>
  );
}

/** "Scan cards" from the app: the same start form in a modal, over the page the user is on. */
export function ScanStartDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Scan cards">{open && <ScanStartForm />}</DialogContent>
    </Dialog>
  );
}

/** Setup warnings, expansion and default condition, then start a session and go to the camera. */
function ScanStartForm() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [expansion, setExpansion] = useState("");
  const [condition, setCondition] = useState("NM");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<OpenSession[]>([]);
  const phone = isPhone();

  // Sessions left open (e.g. the phone is still scanning): offered to resume. Optional, a failure hides them.
  useEffect(() => {
    listSessions()
      .then((r) => setOpen(r.results))
      .catch(() => setOpen([]));
  }, []);

  useEffect(() => {
    getSetup()
      .then((s) => {
        setSetup(s);
        setExpansion(s.defaults.expansion_id === null ? "" : String(s.defaults.expansion_id));
        setCondition(s.defaults.condition);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function discard(uuid: string) {
    try {
      await discardSession(uuid);
    } catch (err) {
      // 404: already discarded (another tab, the phone). Anything else is shown and the session stays listed.
      if (!(err instanceof ApiError && err.status === 404)) return void setError((err as Error).message);
    }
    setOpen((list) => list.filter((s) => s.uuid !== uuid));
  }

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
    <>
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
      {open.length > 0 && (
        <>
          <OpenSessions sessions={open} onDiscard={discard} />
          <div className="flex items-center gap-3 text-xs text-placeholder" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            or start a new session
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
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

            <Button type="submit" variant={open.length > 0 ? "raised" : "primary"} size="wide" disabled={busy}>
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
    </>
  );
}

/** The open sessions, newest activity first: the first one stands out, each one resumes at its camera page or is discarded. */
function OpenSessions({ sessions, onDiscard }: { sessions: OpenSession[]; onDiscard: (uuid: string) => Promise<void> }) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <section aria-labelledby="open-sessions" className="flex flex-col gap-2.5">
      <h2 id="open-sessions" className={cn(EYEBROW, "m-0 font-normal")}>Open sessions</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {sessions.map((s, i) => {
          const label = `${s.expansion ? `${s.expansion.code.toUpperCase()} · ${s.expansion.name}` : "All expansions"} · ${s.default_condition}`;
          const cards = `${s.count} card${pluralize(s.count)}`;
          return (
            <li
              key={s.uuid}
              className={cn(
                "flex min-h-[66px] items-center gap-3.5 rounded-lg border py-3 pr-3 pl-3.5",
                confirming === s.uuid ? "border-danger-line bg-danger-bg" : i === 0 ? "border-[#4A4128] bg-[#211F1A]" : "border-line bg-sidebar",
              )}
            >
              {confirming === s.uuid ? (
                <>
                  <p className="m-0 min-w-0 flex-1 text-sm text-danger-hi">
                    Discard this session and its {cards}?
                  </p>
                  <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setConfirming(null)}>Cancel</Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await onDiscard(s.uuid);
                      setBusy(false);
                      setConfirming(null);
                    }}
                  >
                    Discard
                  </Button>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="inline-flex size-10 flex-none items-center justify-center rounded-lg bg-gold-bg text-gold max-[479px]:hidden">
                    <ScanIcon size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-semibold">
                      {s.expansion ? (
                        <>
                          {s.expansion.code.toUpperCase()}
                          <span className="max-[479px]:hidden"> · {s.expansion.name}</span>
                        </>
                      ) : (
                        "All expansions"
                      )}{" "}
                      · {s.default_condition}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      <span className="font-mono text-text-2">{cards}</span> · started {naturaltime(s.created_at)}
                    </span>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="size-10" aria-label={`Discard ${label}`} title="Discard session"
                    onClick={() => setConfirming(s.uuid)}>
                    <TrashIcon />
                  </Button>
                  <Button asChild variant={i === 0 ? "primary" : "raised"} className="min-h-10">
                    <Link to={`/scan/${s.uuid}/`} aria-label={`Resume ${label}`}>Resume</Link>
                  </Button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
