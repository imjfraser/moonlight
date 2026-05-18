#!/bin/bash
# Moonlight web app launcher (matches Bucket 3 pattern: Next.js + systemd + Caddy)
set -euo pipefail
cd /home/ubuntu/moonlight
export PORT=3002
export HOSTNAME=127.0.0.1
# Source .env.local if present so ANTHROPIC_API_KEY (and any others)
# are available to the Next.js server process. .env.local is gitignored.
if [ -f /home/ubuntu/moonlight/.env.local ]; then
  set -a
  . /home/ubuntu/moonlight/.env.local
  set +a
fi
exec npm start
