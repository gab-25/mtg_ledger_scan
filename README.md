# mtg_ledger_ui

MTG Ledger UI — the web interface of [MTG Ledger](https://github.com/gab-25/mtg_ledger_core), as a React
single-page app: collection, sale listings, card database, shipments, sync, profile and the camera scan.

mtg_ledger_core serves the built app (same origin, same login: `index.html` for every page URL, assets under
`/static/ui/`) and does the work through its JSON API under `/api/`.

### Scanning

Frame a card with the phone: it is recognised, matched against the CardTrader catalog and added to a draft you
review and save into the collection.

- **No page reloads**: start, camera, confirm/search and review all happen in one page.
- **Auto-shoot**: with **Auto** on, the phone shoots by itself when a card fills the box, is in focus and is held
  still; after each shot it waits for the box to be empty before the next card. The shutter always works too.
- One card at a time: an uncertain card opens the confirm panel over the camera right away.

The scan screens use the API under `/api/scan/` — see
[gab-25/mtg_ledger_core#10](https://github.com/gab-25/mtg_ledger_core/issues/10) for the contract.

## Structure

- `src/App.tsx` — the routes: the same URLs as the former Django pages (`/`, `/cards/…`, `/sale/…`, `/shipments/…`,
  `/sync/`, `/account/`, `/login/`) and the scan under `/scan/…`
- `src/pages/` — one component per page; `src/layout/` — sidebar with counters and user card
- `src/api/` — typed client of `/api/`, one module per area (session cookie + Django CSRF; DRF errors
  `{"detail", "code"}` or field messages kept by field; `not_authenticated` → login, `closed` session → Collection;
  photo uploads retried with the same `capture_id`)
- `src/actions.ts` — `useAction`: a form post of a page (messages, reload of every query, errors)
- `src/notifications.tsx` — the message list of every page (like Django's messages: shown on this page, or on the
  next one after an action that navigates)
- `src/components/` — `DataTable` (every table, on [TanStack Table](https://tanstack.com/table); filtering and
  pagination happen on the server), `Field`, `Pager`, `Badge`, `StatTile`, icons, and the scan components
- `src/format.ts` — numbers and dates as Django's templates wrote them (en-us, Europe/Rome)
- Data comes through [TanStack Query](https://tanstack.com/query).
- `src/autoscan/` — `analyze.ts` (edges, sharpness, motion of the guide region), `machine.ts` (when to shoot),
  `useAutoscan.ts` (the loop), `config.ts` (thresholds)
- `src/camera/` — rear camera stream and cropping the photo to the on-screen guide
- `src/screens/` — the scan: Start, Camera (with the QR hand-off page for desktops) and Review

The look is `src/styles/app.css` (design tokens and components); `src/styles/scan.css` adds the scan screens.

## Development

```bash
npm install
npm test            # Vitest
npm run typecheck
```

Copy `.env.example` to `.env` if you need other ports (`DJANGO_PORT`, default 8000; `VITE_PORT`, default 5173).

Run mtg_ledger_core (`uv run python manage.py runserver` in its checkout), then:

```bash
npm run dev
```

and open http://localhost:5173/. Vite serves every page with live reload and forwards `/api/`, `/admin/` and
`/static/` to Django, so the whole site works from that address.

### On the phone

The camera needs HTTPS and a phone. `npm run dev:phone` publishes the Vite dev server on your tailnet with
`tailscale serve`, so the phone gets the app with live reload:

1. Install Tailscale on the computer and on the phone (same account); in the admin console enable **MagicDNS** and
   **HTTPS Certificates**. If `tailscale serve` is refused, allow your user once with
   `sudo tailscale set --operator=$USER`.
2. In mtg_ledger_core's `.env` allow the tailnet name (`<pc>.<tailnet>.ts.net`, shown by `tailscale status`) and start
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
start Django with `UI_APP_DIR` pointing at `dist/`.

### Tuning auto-shoot

Open the camera with `?debug=1` (e.g. `/scan/<session>/?debug=1`) to see the live phase and metrics: `edges`
(card in the box), `sharp` (focus) and `motion` (stillness). Adjust the thresholds in `src/autoscan/config.ts`.

## Release

Publish a GitHub release `vX.Y.Z`: the Release workflow runs the tests, builds the app and attaches
`mtg-ledger-ui.tar.gz` (the contents of `dist/`). The mtg_ledger_core Docker image downloads the latest release at
build time, so rebuilding it ships the new version.
