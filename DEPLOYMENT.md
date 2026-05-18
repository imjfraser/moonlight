# Moonlight deployment notes

## Live URLs

- **Internal (works today):** `http://18.219.171.81:3002` *(direct port, internal only)*
- **Via Caddy with Host header:**
  `curl -H 'Host: moonlight.bucket3.ai' http://18.219.171.81/`
  (Caddy returns a 308 redirect to https://moonlight.bucket3.ai/ - HTTPS won't work
  until DNS is in place.)
- **Intended:** `https://moonlight.bucket3.ai` *(blocked on DNS - see below)*

## What is deployed

| Item | Path |
| --- | --- |
| App source | `/home/ubuntu/moonlight/` |
| Build output | `/home/ubuntu/moonlight/.next/` |
| systemd unit | `/etc/systemd/system/moonlight.service` |
| Logs | `/home/ubuntu/logs/moonlight.log` |
| Port (localhost) | 3002 |
| Caddy block | appended to `/etc/caddy/Caddyfile` (backup at `Caddyfile.bak-20260517-moonlight`) |

## Verified

- `sudo systemctl is-active moonlight` -> `active`
- `sudo systemctl is-enabled moonlight` -> `enabled`
- All 7 routes return HTTP 200 from `http://127.0.0.1:3002`
- Caddy reload accepted the new config (`caddy validate` passed)
- The app's memory footprint is ~60 MB RSS

## Remaining: DNS

`moonlight.bucket3.ai` has no DNS record yet. The host's public IP is
**18.219.171.81**.

Add an `A` record:

```
Name:  moonlight.bucket3.ai
Type:  A
Value: 18.219.171.81
TTL:   300
```

After the record is created and resolves, Caddy will provision a Let's Encrypt
certificate automatically on first HTTPS hit. No further server-side change
needed.

This is the only step Claude could not complete autonomously - AWS CLI / Route
53 access is not available on Bucket 3 or DeerLake from inside this prototype's
toolchain.

## Restart / redeploy commands

```bash
# Restart the service
sudo systemctl restart moonlight

# Tail logs
tail -f /home/ubuntu/logs/moonlight.log

# Rebuild after source changes
cd /home/ubuntu/moonlight && npm install && npm run build && sudo systemctl restart moonlight

# Validate Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload Caddy
sudo systemctl reload caddy
```

## Reverting

To remove Moonlight cleanly:

```bash
sudo systemctl disable --now moonlight
sudo rm /etc/systemd/system/moonlight.service
sudo cp /etc/caddy/Caddyfile.bak-20260517-moonlight /etc/caddy/Caddyfile
sudo systemctl reload caddy
# Optionally: rm -rf /home/ubuntu/moonlight
```
