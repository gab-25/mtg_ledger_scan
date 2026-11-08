# mtg_ledger_scan

MTG Ledger Scan — the camera scanning app of [MTG Ledger](https://github.com/gab-25/mtg_ledger), as a React
single-page app. Frame a card with the phone: it is recognised, matched against the CardTrader catalog and added to a
draft you review and save into the collection.

- **No page reloads**: start, camera, confirm/search and review all happen in one page.
- **Auto-shoot**: with **Auto** on, the phone shoots by itself when a card fills the box, is in focus and is held
  still; after each shot it waits for the box to be empty before the next card. The shutter always works too.
- One card at a time: an uncertain card opens the confirm panel over the camera right away.

mtg_ledger serves the built app (same origin, same login) and does the work through its JSON API under
`/api/scan/` — see [gab-25/mtg_ledger#10](https://github.com/gab-25/mtg_ledger/issues/10) for the contract.

## Structure

- `src/api/` — typed client of `/api/scan/` (session cookie + Django CSRF; 401 → login, closed session →
  Collection; photo uploads retried with the same `capture_id`)
- `src/autoscan/` — `analyze.ts` (edges, sharpness, motion of the guide region), `machine.ts` (when to shoot),
  `useAutoscan.ts` (the loop), `config.ts` (thresholds)
- `src/camera/` — rear camera stream and cropping the photo to the on-screen guide
- `src/screens/` — Start, Camera (with the QR hand-off page for desktops) and Review
- `src/components/` — header, last-card toast, confirm/search panel, review row

The look comes from mtg_ledger's `/static/theme/app.css` (loaded by `index.html`); `src/styles/scan.css` only adds
what the single-page app needs.

## Development

```bash
npm install
npm test            # Vitest
npm run typecheck
```

Run mtg_ledger on port 8000 (`uv run python manage.py runserver`), then:

```bash
npm run dev
```

and open http://localhost:5173/scan/. Vite forwards `/api`, `/static`, `/login`, `/logout` and `/account` to Django,
so you log in once through the proxied login page.

### On the phone

The camera needs HTTPS and a phone. Build the app and let mtg_ledger serve it over Tailscale:

```bash
npm run build
# in ../mtg_ledger
SCAN_APP_DIR=../mtg_ledger_scan/dist scripts/dev-phone.sh
```

### Tuning auto-shoot

Open the camera with `?debug=1` (e.g. `/scan/<session>/?debug=1`) to see the live phase and metrics: `edges`
(card in the box), `sharp` (focus) and `motion` (stillness). Adjust the thresholds in `src/autoscan/config.ts`.

## Release

Publish a GitHub release `vX.Y.Z`: the Release workflow runs the tests, builds the app and attaches
`mtg-ledger-scan-X.Y.Z.tar.gz` (the contents of `dist/`). In mtg_ledger, set `SCAN_VERSION=X.Y.Z` in the `Dockerfile`
to ship it.
