#!/bin/bash
# Moonlight web app launcher (matches Bucket 3 pattern: Next.js + systemd + Caddy)
set -euo pipefail
cd /home/ubuntu/moonlight
export PORT=3002
export HOSTNAME=127.0.0.1
exec npm start
