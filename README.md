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

- `src/api/` — typed client of `/api/scan/` (session cookie + Django CSRF; DRF errors `{"detail", "code"}` or
  field messages; `not_authenticated` → login, `closed` session → Collection; photo uploads retried with the same
  `capture_id`)
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

Copy `.env.example` to `.env` if you need other ports (`DJANGO_PORT`, default 8000; `VITE_PORT`, default 5173).

Run mtg_ledger (`uv run python manage.py runserver` in its checkout), then:

```bash
npm run dev
```

and open http://localhost:5173/. Vite serves the scan app under `/scan/` with live reload and forwards every other
URL (collection, login, `/api/scan/`, `/static/`…) to Django, so the whole site works from that address.

### On the phone

The camera needs HTTPS and a phone. `npm run dev:phone` publishes the Vite dev server on your tailnet with
`tailscale serve`, so the phone gets the app with live reload:

1. Install Tailscale on the computer and on the phone (same account); in the admin console enable **MagicDNS** and
   **HTTPS Certificates**. If `tailscale serve` is refused, allow your user once with
   `sudo tailscale set --operator=$USER`.
2. In mtg_ledger's `.env` allow the tailnet name (`<pc>.<tailnet>.ts.net`, shown by `tailscale status`) and start
   `uv run python manage.py runserver`:
   ```
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,<pc>.<tailnet>.ts.net
   DJANGO_CSRF_TRUSTED_ORIGINS=https://<pc>.<tailnet>.ts.net
   DJANGO_BEHIND_HTTPS_PROXY=true
   ```
   (`OPENROUTER_API_KEY` must be set there too for card recognition.)
3. `npm run dev:phone`: it checks Tailscale and that Django accepts the tailnet name (printing the lines above if
   not), then prints `https://<pc>.<tailnet>.ts.net`.
4. Open that address on the computer, start a session in **Scan cards** and scan the QR code with the phone.

To try the production setup instead (Django serving the build, as in the Docker image), run `npm run build` and
start Django with `SCAN_APP_DIR` pointing at `dist/`.

### Tuning auto-shoot

Open the camera with `?debug=1` (e.g. `/scan/<session>/?debug=1`) to see the live phase and metrics: `edges`
(card in the box), `sharp` (focus) and `motion` (stillness). Adjust the thresholds in `src/autoscan/config.ts`.

## Release

Publish a GitHub release `vX.Y.Z`: the Release workflow runs the tests, builds the app and attaches
`mtg-ledger-scan.tar.gz` (the contents of `dist/`). The mtg_ledger Docker image downloads the latest release at
build time, so rebuilding it ships the new version.
