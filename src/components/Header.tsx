import type { ReactNode } from "react";

/** The top of every non-camera screen: app name and the way back to mtg_ledger (no sidebar). */
export default function Header({ eyebrow, title, actions }: { eyebrow?: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <>
      <nav className="app-bar" aria-label="Main navigation">
        <a className="brand" href="/">
          <span className="brand-name">MTG Ledger</span>
        </a>
        <a className="btn btn-ghost btn-sm" href="/">
          Collection
        </a>
      </nav>
      <header className="page-head">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h1>{title}</h1>
        </div>
        {actions && <div className="actions">{actions}</div>}
      </header>
    </>
  );
}
