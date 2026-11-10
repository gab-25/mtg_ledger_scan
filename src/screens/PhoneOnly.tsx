import { Button } from "@/components/ui/button";
import { APP_MAIN, HINT, NOTE, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { Session } from "../api/types";
import Header from "../components/Header";
import QrCode from "../components/QrCode";

export function sessionLabel(session: Session) {
  return `${session.expansion ? session.expansion.code.toUpperCase() : "All expansions"} · ${session.default_condition}`;
}

/** A desktop opened the camera: hand the session over to the phone with a QR code. */
export default function PhoneOnly({ session, onSearch }: { session: Session; onSearch: () => void }) {
  return (
    <main className={APP_MAIN}>
      <Header
        eyebrow={`Session · ${sessionLabel(session)}`}
        title="Continue on your phone"
        actions={
          <>
            <Button type="button" onClick={onSearch}>Search</Button>
            <Button asChild><Link to={`/scan/${session.uuid}/review`}>Review ({session.count})</Link></Button>
          </>
        }
      />
      <section className="flex max-w-[420px] flex-col gap-3 rounded-xl border border-line bg-card p-5" aria-labelledby="qr-help">
        <QrCode value={session.phone_url} label={`QR code linking to ${session.phone_url}`} />
        <p className={cn(HINT, "m-0")} id="qr-help">
          Scanning works with a smartphone camera only (webcams can't focus on a card up close). Scan this code with
          your phone, sign in if asked, and keep scanning there: the cards show up in Review here too.
        </p>
        <p className={cn(SUB, "m-0 font-mono break-all")}>{session.phone_url}</p>
        {!session.phone_secure && (
          <p className={cn(NOTE, "m-0")}>
            This address is not HTTPS: the phone will open the page but won't allow the camera (it needs HTTPS).
          </p>
        )}
      </section>
    </main>
  );
}
