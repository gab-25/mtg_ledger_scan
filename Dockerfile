# The built app (dist/) alone, for mtg_ledger_core's Docker image to copy:
#   FROM ghcr.io/gab-25/mtg_ledger_ui:X.Y.Z AS ui ... COPY --from=ui / /app/ui_app
# Built by the Release workflow after `npm run build`; it cannot run on its own (no shell, no server).
FROM scratch
COPY dist/ /
