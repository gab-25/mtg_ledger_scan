#!/usr/bin/env bash
# Develop the scan app on the phone: Vite (live reload) published over HTTPS on your tailnet.
#
#   npm run dev:phone
#
# Needs: Tailscale running on this computer and on the phone (same account), MagicDNS and HTTPS Certificates
# enabled in the Tailscale admin console, and mtg_ledger's `manage.py runserver` already running on DJANGO_PORT
# with the tailnet name allowed in its .env (the script tells you the exact lines).
# Options (environment or .env): DJANGO_PORT (default 8000), VITE_PORT (default 5173).
# Ctrl+C stops Vite and removes the Tailscale serve rule.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
DJANGO_PORT="${DJANGO_PORT:-8000}"
VITE_PORT="${VITE_PORT:-5173}"

die() { echo "error: $*" >&2; exit 1; }

command -v tailscale >/dev/null || die "tailscale is not installed (https://tailscale.com/download)."
command -v curl >/dev/null || die "curl is not installed."

status_json="$(tailscale status --json 2>/dev/null)" || die "tailscale is not running: start it with 'sudo tailscale up'."
read -r backend dns certs < <(python3 -c '
import json, sys
d = json.load(sys.stdin)
print(d.get("BackendState", ""), (d.get("Self") or {}).get("DNSName", "").rstrip(".") or "-", len(d.get("CertDomains") or []))
' <<<"$status_json")

[[ "$backend" == "Running" ]] || die "tailscale is '$backend': connect it with 'sudo tailscale up'."
[[ "$dns" != "-" ]] || die "this machine has no Tailscale DNS name: enable MagicDNS in the admin console."
[[ "$certs" -gt 0 ]] || die "HTTPS certificates are off: enable 'HTTPS Certificates' in the Tailscale admin console (DNS page)."

if ! python3 -c 'import socket, sys; s = socket.socket(); s.bind(("127.0.0.1", int(sys.argv[1])))' "$VITE_PORT" 2>/dev/null; then
  die "port $VITE_PORT is already in use: stop what is listening there, or set VITE_PORT."
fi

# Django must be up and accept requests for the tailnet name, as they arrive through Tailscale.
code="$(curl -s -o /dev/null -w '%{http_code}' -H "Host: ${dns}" -H "X-Forwarded-Proto: https" \
  "http://127.0.0.1:${DJANGO_PORT}/login/" || true)"
if [[ "$code" == "000" ]]; then
  die "mtg_ledger is not running on port ${DJANGO_PORT}: start it with 'uv run python manage.py runserver ${DJANGO_PORT}'."
fi
if [[ "$code" == "400" ]]; then
  die "mtg_ledger refuses the tailnet address. Put these lines in mtg_ledger's .env and restart runserver:
  DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,${dns}
  DJANGO_CSRF_TRUSTED_ORIGINS=https://${dns}
  DJANGO_BEHIND_HTTPS_PROXY=true"
fi

if ! tailscale serve --bg --yes --https=443 "http://127.0.0.1:${VITE_PORT}" >/dev/null; then
  die "tailscale serve failed. If it is a permission error, allow your user once with: sudo tailscale set --operator=\$USER"
fi
cleanup() { tailscale serve --https=443 off >/dev/null 2>&1 || true; }
trap cleanup EXIT

cat <<INFO

  MTG Ledger with the live scan app is on your tailnet:  https://${dns}

  Open it on the computer, start a session in Scan cards and scan the QR code with the phone
  (Tailscale on). Saving a file in src/ reloads the page on the phone.
  Ctrl+C stops Vite and removes the Tailscale rule (Django keeps running).

INFO

DEV_PHONE=1 DJANGO_PORT="$DJANGO_PORT" VITE_PORT="$VITE_PORT" npx vite
