# Moonlight / Luz de Luna

Bilingual entrepreneurship mini-incubator: a guided business-building journey with Sol,
followed by continuing coaching. Registration is open to aspiring entrepreneurs,
while its Latin America-rooted EN/ES experience and Sol’s warm voice remain central.
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
| `/login` | Participant registration and email sign-in |
| `/admin/login` | Separate administrator email sign-in |
| `/account` | Own-account private vault download |
| `/admin` | Aggregate metrics and metadata-only account support |
| `/start` | Authenticated intake |
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


## Program and milestones

The existing curriculum has seven stages: greeting, skill exploration, first-customer
identification, offer proposal, action drafted, marketing plan, and done. Seven
small EN/ES-accessible squares show observed stages, the outlined current stage,
and empty upcoming stages. Skipped stages are not inferred as completed. The last
square fills only when the journey has reached done and the offer, message, plan,
and confirmed published shop are ready. This is a preparation milestone, not a
certificate, completed sale, sent customer message, or income guarantee. Sol remains
available afterwards; the coaching prompt and voice are unchanged.

## Private account vault

SQLite is still authoritative. A durable SQLite queue projects each registered
participant's existing data into a private local Git-versioned Markdown vault.
The app worker polls every 30 seconds; no extra service or Git remote is provisioned.
Profile, business artifacts, timeline, and saved conversation are private owner data,
not an admin support surface. `/account` offers an authenticated owner-only ZIP
export of current committed allowlisted files, not Git history. Authorization is
rechecked after asynchronous export work. See `ops/PRIVATE-VAULT.md` for queue,
retry, permissions, export limits, and recovery details. Local Git is not a replacement
for SQLite backups or an off-host backup.

## Admin metrics and access boundaries

Every admin page/API checks a separate active admin session and role server-side.
User search/list and enable/disable support use an explicit metadata allowlist.
Admin pages, APIs, support, and exports must never expose conversation/message
content, private state, vault files, Git history/diffs, or participant ZIPs.

Metric definitions below describe the implemented counters, not inferred outcomes.
There is no retrospective transcript analysis or historical telemetry backfill.

| Metric | Definition / limitation |
| --- | --- |
| Signups | Registered user-role accounts (not guest records or admin-only accounts). |
| DAU / WAU / MAU | Distinct registered participants with recorded activity today / trailing 7 / trailing 30 UTC calendar days, including today. Activity is successful journey writes or authenticated coach requests, not passive page views. |
| Sessions started / completed | Recorded coaching journeys: first nonempty saved conversation starts one; first saved `done` completes it. Reset to an empty conversation ends the previous journey. These are not browser visits. |
| Arc completion rate | Completed journeys divided by started journeys; null without a denominator. |
| Average session length | Mean elapsed seconds from first recorded turn to first saved `done` among completed journeys, not active reading/typing time. Null when none are completed. |
| EN / ES split | Journey counts by recorded language, not population or page-view percentages. |
| Shops created / published | Current owned shop records for registered participants. Both coincide because initial creation and publication share one atomic save; not separate funnel events. |
| First-customer message drafted | Participants with a recorded nonempty saved message milestone, counted once; not evidence that a message was sent or a customer paid. |
| Save failures | Failed instrumented state/shop writes, including HTTP 4xx/5xx and thrown errors; not offline browser failures never received by the server. |
| Build / API error rate | Recorded failures divided by attempts, null without attempts. API coverage is state, shops, coach, and builder, including 4xx/5xx; builds are those run through the instrumented build script, not historical releases. |
| Conversion rate / MRR / churn | Null: payments are not implemented. Not measured zero revenue or churn. |
| Acute-distress disclosures handled | Null/unavailable: no reliable structured handled-disclosure signal exists. No classifier or proxy from notices/transcripts is invented. Count-only instrumentation requires a separate decision; `coach-prompt.js` remains untouched. |

Counters start when instrumentation is installed; account/shop totals use current
records. No administrator is seeded automatically: use the explicit provisioning
CLI above only for an authorized administrator.

## Remaining decisions and verification gaps

- Dedicated Moonlight email branding/domain, if desired; the authorized verified
  Pegasus sender is currently used. No real-recipient email delivery test is claimed.
- A reliable count-only safety event contract before that metric can be populated.
- Payments, pricing/enrollment entitlements, and Telegram identity linking/client
  are future work. The web account is the canonical identity for that future surface.
