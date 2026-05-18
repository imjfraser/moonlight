# Moonlight — internal prototype

> Moonlight helps people who are vulnerable to sexual, economic, and trafficking
> exploitation build safer digital income pathways with an AI business coach
> and simple online tools.

This is an **internal exploratory MVP**. It is not for live participant use.

## What this prototype demonstrates

A guided journey from a vague intent -> a chosen business idea -> a structured
**architect -> operator brief** -> a generated **business kit** -> a simple
**generated website preview** with privacy controls. It also includes an
internal-facing funding/partner page.

Screens:

| Path | Purpose |
| --- | --- |
| `/` | Landing / concept page |
| `/start` | Guided intake (4 friendly steps) |
| `/architect` | Architect agent: suggests 2-4 micro-business paths |
| `/brief` | Operator brief: the architect->builder handoff, made visible |
| `/kit` | Generated business kit: names, copy, pricing, posts, actions |
| `/preview` | Simple generated business website with public/private toggle |
| `/funding` | Internal-facing funding/partner page |

## Stack

- **Next.js 15** (App Router, JSX, no TypeScript to keep the prototype small)
- **React 19**
- A single global CSS file - no Tailwind dependency
- Client-side `sessionStorage` for the journey state - no database
- All "agents" are deterministic mocks in `app/lib/generate.js`

## Run locally

```bash
cd moonlight
npm install
npm run dev       # http://localhost:3002
```

For a production build:

```bash
npm run build
npm start         # serves on port 3002
```

## Live deployment

The live prototype runs on Bucket 3 (18.219.171.81):

- App: `/home/ubuntu/moonlight/`
- systemd unit: `/etc/systemd/system/moonlight.service` (enabled, restart=always)
- Logs: `/home/ubuntu/logs/moonlight.log`
- Port: 3002 (localhost only)
- Caddy block: `moonlight.bucket3.ai -> localhost:3002`

The instructions originally asked for a Dockerized Coolify deployment.
**Bucket 3 today does not run Docker or Coolify.** Existing internal sites
(cop-bucket3, myopreserve) are deployed as plain Next.js apps running under
`systemd`, reverse-proxied by **Caddy** which terminates TLS via the
`bucket3.ai` zone.

To match that pattern, Moonlight ships the same way. A `Dockerfile` is
included for future Coolify migration but is not used by the live deployment.

### Bring-up steps (already run)

```bash
# Files synced into /home/ubuntu/moonlight/
cd ~/moonlight && npm install && npm run build
sudo cp ops/moonlight.service /etc/systemd/system/moonlight.service
sudo systemctl daemon-reload && sudo systemctl enable --now moonlight
# Caddy block appended; sudo systemctl reload caddy
```

## File map

```
moonlight/
|- app/
|  |- globals.css
|  |- layout.jsx
|  |- page.jsx                # /
|  |- start/page.jsx          # /start
|  |- architect/page.jsx      # /architect
|  |- brief/page.jsx          # /brief
|  |- kit/page.jsx            # /kit
|  |- preview/page.jsx        # /preview
|  |- funding/page.jsx        # /funding
|  `- lib/
|     |- session.js           # client-side journey state
|     `- generate.js          # deterministic mock architect/builder
|- ops/
|  `- moonlight.service       # systemd unit
|- public/
|- start.sh
|- Dockerfile                 # for future Coolify
|- next.config.mjs
|- package.json
`- README.md
```

## What is mocked vs. real

| Piece | Status |
| --- | --- |
| UI / journey / screens | Real |
| Architect "agent" | Mocked - deterministic logic in `lib/generate.js` |
| Builder "agent" | Mocked - deterministic logic in `lib/generate.js` |
| Persistence | Client-side `sessionStorage` only - clears when the tab closes |
| Auth | None - relies on internal-only DNS/network |
| Real AI calls | None in this prototype |

## Known gaps / risks

- This is NOT ready for real vulnerable users. No safeguarding review yet.
- No real persistence. Refresh outside a session clears state.
- No real agent - the "ideas" pool is a small handcrafted list.
- No DNS record yet for `moonlight.bucket3.ai` (see DEPLOYMENT.md).
- No localisation / i18n.
- No accessibility audit yet.

## Recommended next build steps

1. Add DNS record `moonlight.bucket3.ai -> 18.219.171.81`.
2. Wire the architect to a real conversation agent and the builder to a real
   generator that uses the partner methodology content.
3. Move journey state to a server-side store; allow resume.
4. Trauma-informed UX pass with a safeguarding partner.
5. Localisation (Spanish first; Rebel LATAM context).
6. WhatsApp-first delivery for low-bandwidth users.
7. Partner panel for real-time human handoff.
