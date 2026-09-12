# Moonlight / Luz de Luna

Entrepreneurship coaching Next.js application for a guided business-building journey.
This repository is a prototype, not a declaration of production readiness.
Product direction: paid entrepreneurship coaching, not donor-funded. Payment
processing is not implemented.

## Current architecture

- Next.js 15 App Router, React 19, JSX and global CSS.
- SQLite via `better-sqlite3`, WAL mode and versioned migrations; participant,
  journey-state, shop and milestone tables. Not a database-free mock.
- Public registration and sign-in use verified email magic links through Resend.
  One canonical participant UUID owns each account, journey and shop; later logins
  reuse that identity. Tokens are stored hashed, links expire after 15 minutes and
  are consumed atomically; 30-day server sessions are revocable and recheck account
  status on every request. User/admin audiences use separate secure HttpOnly cookies.
  Legacy guest-id cookies and unbound guest caches do not authenticate or merge.
- Journey saves use server revisions and atomic writes. The client serializes
  saves and retains failed drafts in a per-tab journal; conflicts require an
  explicit user decision rather than silently replacing server data.
- Owner shop writes validate supported shapes. Public shop responses use an
  explicit projection and omit a real name unless sharing is enabled.
- Builder requests and outputs are validated: 8 MiB request-body limit, at most
  20 messages, 4,000 characters per message and 32,000 history characters.
  One-process token buckets allow 60 global and 10 per-cookie requests at full
  capacity, refilling at those rates per minute; anonymous and bounded overflow
  buckets also apply. These are not distributed limits.
- Coach requests use the same canonical participant identity and existing journey
  memory, with a matching cache scope required before reading that memory. A
  transport-independent context helper supplies existing offer, draft and marketing
  facts plus validated recent assistant artifacts; this is not a separate memory
  store or a shipped Telegram identity integration.
- Coach transport limits: 1 MiB request body, up to 40 recent messages, 4,000
  content characters per message and 64,000 serialized history characters.
  Only the outbound context window is bounded; the full saved transcript is retained.
  Existing response states and nested business artifacts are validated. The coach
  has its own 60-global/10-per-cookie per-minute token buckets, independent of the
  builder, with a 60-second provider timeout and no automatic retries.
- Coach failures use HTTP 400/413 for invalid/oversized requests, 409 for mismatched
  identity scope, 429 with Retry-After for quotas, 502 for upstream/invalid model
  responses, 503 for unavailable memory and 504 for provider timeouts. Raw provider
  output/errors are not exposed. Web requests capture their sending scope and ignore
  late responses after identity changes; a confirmed scope mismatch invalidates the
  old in-memory session without deleting its recoverable scoped drafts.
- Shared storefront section rendering keeps owner/public section layouts aligned.
  Gallery uploads accept PNG/JPEG/WebP/GIF up to 2 MiB per file; the server
  applies the same inline-image cap and an 8 MiB serialized shop limit.
- Public shops render server-side using the public projection. Missing shops
  return 404; metadata includes title/description, canonical and EN/ES alternate
  URLs plus Open Graph fields. This is not a claim of a custom social-preview image.
- Storefront language is selected by a valid `?lang=en` or `?lang=es`, then the
  `moonlight.lang` cookie, defaulting to English. The language toggle persists
  the preference and reloads storefronts with the explicit language query.
  Client shell and document language synchronize after hydration.
- `coach-prompt.js` is unchanged; shared persistence supports the entire
  participant journey.

## Continuing with Sol

The coach remains available after the initial plan. Reload restores existing
business artifacts, and failed user turns stay in the saved/draft conversation
for retry without duplication. Every provider request waits for journey-save
acknowledgement; failed saves must be resolved first. Starting a new plan requires
confirmation and does not delete an existing shop.

The coach publishes missing shops through the same validated owner store used by
`/me`, reports actual publication status, and never automatically replaces an
existing owner's offer, contact or sections. Historical unbound browser caches
are not imported; a missing shop can be rebuilt from the current participant's
already-saved coach artifacts. This is not account recovery.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Introduction |
| `/start` | Intake |
| `/architect` | Business-idea journey |
| `/brief` | Structured handoff |
| `/kit` | Generated business kit |
| `/preview` | Illustrative kit website/privacy preview; saves journey state, not a public shop |
| `/me` | Owner shop editing and live public-shop publication |
| `/shop/[handle]` | Public server-rendered storefront |

## Development

```sh
npm ci
npm run dev
```

The development app uses port 3002. `ANTHROPIC_API_KEY` is server-side optional
configuration for provider-backed generation; keep credentials out of source.
`NEXT_PUBLIC_SITE_URL` optionally supplies the storefront metadata origin: only
an HTTPS origin with no credentials, path, query, or fragment is accepted;
otherwise metadata uses `https://luzdeluna.app`.
`MOONLIGHT_DATA_DIR` overrides the default `data/` location. Use a disposable
local data directory when developing persistence changes.

## Verification

The `npm test` command runs focused Node built-in tests without new
packages: disposable SQLite persistence, public serialization, mocked browser
save failures/conflicts, builder contracts and limiter behavior. It does not
call a provider or the running application. Production build: `npm run build`.

## Operations

See `DEPLOYMENT.md` for current deployment and `ops/BACKUP.md` for the existing
online-consistent backup schedule and disposable restore verification. Native
SQLite remains a single-host persistence dependency. Distributed quotas and a full accessibility/localization audit are not claimed.


## Accounts and email
- Participant sign-in: `/login`; administrator sign-in: `/admin/login`.
  Registration is open; new verified participant accounts receive a `free`
  enrollment-tier placeholder. No billing or paid-plan behavior is implemented.
- Private journey pages and state/shop/coach/builder APIs require a participant
  session. Browser mutations require the configured application Origin.
  Admin sessions cannot enter participant APIs, and public registration cannot
  assign admin roles. Disabled accounts lose sessions and unused sign-in links.
- Sender: **Luz de Luna <moonlight@pegasuscompanion.com>**, using the existing
  authorized Resend service and verified domain. Links point to
  **https://luzdeluna.app**, never to Pegasus. Tokens travel in URL fragments and
  are verified by POST, not query parameters.
- Configuration: `RESEND_API_KEY`, optional `MOONLIGHT_AUTH_FROM`, optional
  `MOONLIGHT_APP_ORIGIN` (default `https://luzdeluna.app`). Keep credentials in
  the gitignored `.env.local` with mode 0600; never commit them.
- No administrator is seeded automatically. An operator can explicitly run
  `node scripts/provision-admin.mjs --email <authorized-email>`. Promoting an
  existing participant requires the additional `--promote-existing` flag and
  revokes their old sessions. This is not exposed through a web endpoint.
- Verification uses disposable SQLite and mocked email/provider calls. A live
  recovery email to a real recipient has not been tested in this deployment.
