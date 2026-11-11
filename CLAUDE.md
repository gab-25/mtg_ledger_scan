# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The React SPA that is the whole web interface of MTG Ledger. The backend is the sibling repo
[mtg_ledger_core](https://github.com/gab-25/mtg_ledger_core) (Django), which serves this build on the same origin
(`index.html` for every page URL, assets under `/static/ui/`) and exposes a JSON API under `/api/`. Session login and
Django CSRF are shared with it. The scan API contract is gab-25/mtg_ledger_core#10.

## Commands

```bash
npm test                                   # Vitest (jsdom), all tests
npx vitest run src/pages/CardsPage.test.tsx           # one file
npx vitest run src/pages/CardsPage.test.tsx -t "pager" # one test by name
npm run typecheck                          # tsc -b --noEmit
npm run build                              # tsc + vite build into dist/ (base /static/ui/)
npm run dev                                # Vite on :5173, proxies /api /admin /static to Django on :8000
npm run dev:phone                          # same, published over HTTPS on the tailnet (camera needs HTTPS + phone)
```

`npm run dev` needs mtg_ledger_core running (`uv run python manage.py runserver` in its checkout). Ports come from
`.env` (`DJANGO_PORT`, `VITE_PORT`). CI (`.github/workflows/tests.yml`) runs `npm ci`, `typecheck`, `test`; a GitHub
release `vX.Y.Z` builds the app and publishes it as the scratch image
`ghcr.io/gab-25/mtg_ledger_ui:X.Y.Z` (`Dockerfile`: only `dist/`), which the core's Docker image copies the UI from.

## Architecture

- **Routes mirror the former Django pages** (`src/App.tsx`): same URLs and query strings, texts and messages as the
  old templates (components often cite the template they replace, e.g. `ledger/collection.html`). Page state lives
  in the URL query (`useQueryParams`, `hrefWith`), filtering and pagination are server-side.
- **Data**: TanStack Query for reads (`src/queryClient.ts`); `src/api/` is the typed `/api/` client, one module per
  area, built on `request()` in `api/client.ts` (CSRF, DRF errors → `ApiError` with `code` and per-field
  `fields`). `not_authenticated` sends the user to `/login/`.
- **Writes** go through `useAction` (`src/actions.ts`): runs the mutation, shows its messages via
  `src/notifications.tsx` (Django-messages semantics: on this page, or on the next one after a navigating action),
  invalidates every query (so sidebar counters refresh), and exposes field errors via `fieldErrors(error, name)`.
- `src/format.ts` reproduces Django's humanize/floatformat output (en-us, Europe/Rome) — use it for numbers/dates.
- **Scan** (`src/screens/`, `src/autoscan/`, `src/camera/`, `/scan/…`): Start (a modal from "Scan cards", `ScanStartDialog`; `/scan/` still works as a page) → Camera (desktop gets a QR hand-off,
  `PhoneOnly`) → Review, all without reloads. `autoscan/machine.ts` decides when to shoot from metrics computed in
  `autoscan/analyze.ts`; thresholds in `autoscan/config.ts`; `?debug=1` on the camera shows live metrics.
  `CardPicker` is a custom full-screen `role="dialog"` used to confirm uncertain cards or add one by hand.

## Styling: Tailwind v4 + shadcn/ui

- Single stylesheet `src/styles/globals.css`: theme tokens as `--color-*` in `@theme` (shadcn names plus app ones:
  `gold`, `gold-hi`, `gold-bg`, `surface`, `line`, `text-2`, `ok`, `warn`…; gold is `primary`, and shadcn's
  `accent` is the hover surface, **not** gold), fonts `font-serif` (Spectral) / `font-sans` / `font-mono`, base
  rules, print overrides. Dark only: `dark:` variants always apply. Line heights are reset to `normal` to match the
  original look.
- `src/components/ui/` are shadcn components restyled with the app's variants (e.g. `Button` variants
  `primary|raised|ghost|danger|pill`, sizes `sm|block|wide|icon`; `Badge` variants matching API badge tones via
  `badgeVariant()` in `api/types.ts`; `RadioChip`/`RadioCard`; `ALL` sentinel in `ui/select.tsx` for "no filter"
  items). After `npx shadcn@latest add …`, check that it didn't import `cn` from the npm package `cn` / add it to
  `package.json` (use `@/lib/utils`), and restyle the new component to the tokens.
- Use shadcn controls, not native `<select>`/checkbox/radio. App-level composites live in `src/components/`
  (`DataTable` + `TableFoot`, `Field` + `ChoiceSelect`, `PageHead`/`Header`, `Filters`, `SearchBox`, `StatTile`…);
  repeated class sets are constants in `src/lib/styles.ts` (`NUM`, `SUB`, `HINT`, `PANEL`, `FORM_GRID`…).
- Phone layout under 840px (`min-[840px]:` / `max-[839px]:`): the sidebar becomes a bottom tab bar, "Scan cards"
  floats over the collection. Prefer CSS for responsive changes; when the markup differs (Collection's card list
  instead of the table) use `useIsMobile()` from `hooks/useMediaQuery.ts`, which is false in jsdom (stub
  `matchMedia` to test the phone branch).
- Print (order packing slip) uses `print:` variants; keep interactive-only parts `print:hidden`.

## Tests

- Page tests render the whole app at a URL with `renderPage(path)` from `src/test/renderPage.tsx` and
  `vi.mock("../api/<module>")`; `mockMe()` provides the logged-in user.
- Don't assert CSS classes for meaning: components expose `data-variant` (Alert, Badge, nav counters) and
  `data-tone` (StatTile, log dot); query by role/label/text otherwise.
- Radix Select: use `chooseOption(trigger, optionName)` from `src/test/select.ts`; a trigger's current value is its
  text content (`toHaveTextContent`), not `toHaveValue`. jsdom stubs Radix needs are in `src/test/setup.ts`.

## Repo notes

- `docs/superpowers/` (specs and plans) is gitignored: keep those files local, never commit them.
