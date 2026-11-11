import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { APP_MAIN, HINT, NOTE } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { Session } from "../api/types";
import Header from "../components/Header";
import QrCode from "../components/QrCode";
import { pluralize } from "../format";

export function sessionLabel(session: Session) {
  return `${session.expansion ? session.expansion.code.toUpperCase() : "All expansions"} · ${session.default_condition}`;
}

/** A desktop opened the camera: hand the session over to the phone with a QR code, and follow its count here. */
export default function PhoneOnly({ session, onSearch }: { session: Session; onSearch: () => void }) {
  return (
    <main className={APP_MAIN}>
      <Header eyebrow={`Session · ${sessionLabel(session)}`} title="Continue on your phone" />
      <section
        className="flex flex-col overflow-hidden rounded-xl border border-line bg-card"
        aria-labelledby="qr-help"
      >
        <div className="grid gap-8 p-6 min-[760px]:grid-cols-[auto_minmax(0,1fr)] min-[760px]:items-center min-[760px]:gap-12 min-[760px]:p-8">
          <div className="flex flex-col items-center gap-3">
            <QrCode value={session.phone_url} label={`QR code linking to ${session.phone_url}`} scale={7} />
          </div>
          <div className="flex min-w-0 flex-col gap-5">
            <p className={cn(HINT, "m-0")} id="qr-help">
              Scanning works with a smartphone camera only (webcams can't focus on a card up close).
            </p>
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              <Step n={1} title="Scan this code with your phone">or open the address below on it.</Step>
              <Step n={2} title="Sign in if asked">with the same account as here.</Step>
              <Step n={3} title="Keep scanning there">the cards show up in Review here too.</Step>
            </ol>
            <CopyLink url={session.phone_url} />
            {!session.phone_secure && (
              <p className={cn(NOTE, "m-0")}>
                This address is not HTTPS: the phone will open the page but won't allow the camera (it needs HTTPS).
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sidebar px-6 py-4 min-[760px]:px-8">
          <span className="text-sm text-text-2">
            <span className="font-mono text-xl text-foreground">{session.count}</span> card{pluralize(session.count)} scanned
          </span>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={onSearch}>Search</Button>
            <Button asChild variant="primary"><Link to={`/scan/${session.uuid}/review`}>Review ({session.count})</Link></Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className="inline-flex size-7 flex-none items-center justify-center rounded-full bg-gold-bg font-mono text-[13px] text-gold">
        {n}
      </span>
      <span className="flex flex-col gap-0.5 pt-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-[13px] text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}

/** The phone address, monospaced, with a button that copies it (for sending it to the phone another way). */
function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  return (
    <div className="flex items-center gap-2 rounded-md border border-line-2 bg-background py-1 pr-1 pl-3">
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={url}>{url}</span>
      <Button type="button" size="sm" className="flex-none" onClick={copy} aria-live="polite">
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
