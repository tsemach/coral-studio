#!/usr/bin/env bash
set -euo pipefail

# Starts a Cloudflare quick tunnel for studio-web's dev server and writes
# the resulting public URL into apps/mobile-app/.env as EXPO_PUBLIC_API_URL.
# Needed for testing on a physical phone via `expo start --tunnel`, where
# "localhost" refers to the phone itself, and (at least under WSL2's NAT
# networking mode, as opposed to mirrored mode) the phone can't reach the
# dev machine's LAN IP directly either.
#
# Quick tunnels are anonymous (no Cloudflare account) and get a brand-new
# random URL every run, so this needs to be re-run -- and Expo restarted,
# since EXPO_PUBLIC_* is baked in at build time -- each time you want to
# test on-device.
#
# Usage: scripts/tunnel-api.sh [port]
#   port defaults to 3500, matching studio-web/package.json's `dev` script.

PORT="${1:-3500}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$MOBILE_APP_DIR/.env"
CLOUDFLARED_BIN="$HOME/.local/bin/cloudflared"
LOG_FILE="/tmp/coral-studio-mobile-tunnel.log"

if command -v cloudflared >/dev/null 2>&1; then
  CLOUDFLARED_BIN="$(command -v cloudflared)"
elif [ ! -x "$CLOUDFLARED_BIN" ]; then
  echo "cloudflared not found -- downloading to $CLOUDFLARED_BIN"
  mkdir -p "$(dirname "$CLOUDFLARED_BIN")"
  curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$CLOUDFLARED_BIN"
  chmod +x "$CLOUDFLARED_BIN"
fi

if ! (exec 3<>"/dev/tcp/localhost/$PORT") 2>/dev/null; then
  echo "Warning: nothing is listening on localhost:$PORT yet -- start studio-web's dev server first (pnpm --filter studio-web dev)." >&2
else
  exec 3>&- 2>/dev/null || true
fi

echo "Starting Cloudflare quick tunnel for http://localhost:$PORT ..."
: > "$LOG_FILE"
nohup "$CLOUDFLARED_BIN" tunnel --url "http://localhost:$PORT" >> "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!
disown

# The assigned URL only appears in cloudflared's log once the tunnel is
# actually up -- poll for it instead of a fixed sleep, since quick-tunnel
# provisioning time varies.
TUNNEL_URL=""
for _ in $(seq 1 30); do
  TUNNEL_URL="$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$LOG_FILE" | head -1 || true)"
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "Timed out waiting for a tunnel URL. Check $LOG_FILE and kill PID $TUNNEL_PID if needed." >&2
  exit 1
fi

echo "Tunnel ready: $TUNNEL_URL (pid $TUNNEL_PID, log: $LOG_FILE)"

# Update (or create) .env's EXPO_PUBLIC_API_URL, preserving every other line.
if [ ! -f "$ENV_FILE" ]; then
  cp "$MOBILE_APP_DIR/.env.example" "$ENV_FILE" 2>/dev/null || touch "$ENV_FILE"
fi

if grep -q '^EXPO_PUBLIC_API_URL=' "$ENV_FILE"; then
  sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$TUNNEL_URL|" "$ENV_FILE"
else
  echo "EXPO_PUBLIC_API_URL=$TUNNEL_URL" >> "$ENV_FILE"
fi

echo "Updated $ENV_FILE"
echo "Restart Expo (pnpm --filter mobile-app start --tunnel) to pick up the new URL."
echo "Stop the tunnel later with: kill $TUNNEL_PID"
