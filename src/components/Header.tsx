import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { META } from "@/lib/styles";
import { Logo } from "./icons";
import { cn } from "@/lib/utils";

/** A page's title: eyebrow, h1 and the page actions on the right. */
export function PageHead({ eyebrow, title, meta, actions }: { eyebrow?: ReactNode; title: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="text-[13px] tracking-[1.5px] text-muted-foreground uppercase print:text-[#444]">{eyebrow}</div>}
        <h1 className="mt-1 mb-0 font-serif text-[30px] font-semibold min-[840px]:text-[40px]">{title}</h1>
        {meta && <div className={cn(META, "mt-1.5")}>{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3 [&_form]:m-0">{actions}</div>}
    </header>
  );
}

/** The top of every non-camera screen: app name and the way back to mtg_ledger_core (no sidebar). */
export default function Header({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <>
      <nav className="flex items-center justify-between gap-3" aria-label="Main navigation">
        <a className="flex items-center gap-3 text-foreground no-underline hover:text-foreground" href="/">
          <Logo />
          <span className="font-serif text-[22px] font-bold tracking-[.2px]">MTG Ledger</span>
        </a>
        <Button asChild variant="ghost" size="sm">
          <a href="/">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Collection
          </a>
        </Button>
      </nav>
      <PageHead eyebrow={eyebrow} title={title} actions={actions} />
    </>
  );
}
