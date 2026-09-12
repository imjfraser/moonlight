# Moonlight deployment

## Current deployment shape

- Host alias: `bucket3`; source: `/home/ubuntu/moonlight`.
- Public application: `https://luzdeluna.app`.
- Application unit: `moonlight.service`; launcher: `start.sh`; port: 3002.
- Application log: `/home/ubuntu/logs/moonlight.log`.
- SQLite defaults to `data/moonlight.sqlite`; `MOONLIGHT_DATA_DIR` may override it.
- Launcher loads gitignored `.env.local` and invokes `npm start`. Keep provider
  credentials server-side; do not paste environment contents into diagnostics.
- Next configuration enables standalone output, but the current launcher uses
  `npm start`, not the standalone server entry point. Preserve this distinction
  when changing packaging. `better-sqlite3` is a native external dependency.

The old DNS-blocked/no-persistence/mock-only deployment notes are obsolete.
Public storefronts now render on the server, with per-shop metadata derived
only from public fields. `?lang=en|es` takes precedence over the language cookie;
English is the fallback. Configure `NEXT_PUBLIC_SITE_URL` only as an HTTPS origin
(no credentials/path/query/fragment) when intentionally changing canonical hosts;
the default is `https://luzdeluna.app`. Metadata contains canonical URLs,
EN/ES alternates and Open Graph text. Verify actual shared-link previews separately.

## Scoped release procedure

Use this only for an authorized deployment. Check the source diff and preserve
unrelated work. Verify a current backup before schema-affecting changes.

```sh
npm ci
npm test
npm run build
sudo systemctl restart moonlight.service
sudo systemctl is-active moonlight.service
```

Do not restart unrelated applications, tunnels, or reverse proxies for a
normal Moonlight application release. Check public page responses and the
relevant user journey after deployment; a successful build alone is not a
functional smoke test. The root page is the basic HTTP 200 health check.
A nonexistent shop should return 404; do not use `/shop/test` as a successful
storefront health check without a deliberately provisioned synthetic fixture.
Read-only checks must not call state/owner endpoints
that create or update participant identity as a side effect.

## Persistence and recovery

Initialization adopts the original schema as version 1 in a transaction and
rejects databases with a newer unsupported version. Shop writes and their
first-creation milestone are atomic. Journey saves compare server revisions.

Scheduled backup uses SQLite's online backup API and retains 14 compressed
snapshots. See `ops/BACKUP.md` for paths, permissions, the repeatable disposable
restore verifier and controlled recovery procedure. Never copy the main live
SQLite file alone as an assumed complete WAL-mode backup; never combine a
restored database with unrelated old WAL/SHM sidecars.

## Account access

Registration is open through `/login`, using Resend email magic links. The existing
verified sending domain is `pegasuscompanion.com`; the display sender is Luz de Luna
and all login URLs use `https://luzdeluna.app`. `RESEND_API_KEY` belongs only in the
ignored `.env.local` (0600). Optional settings: `MOONLIGHT_AUTH_FROM` and
`MOONLIGHT_APP_ORIGIN`. No new external key or domain was created for this release.

Version 2 adds accounts, hashed one-use magic links and revocable server sessions.
Guest test data is not merged into accounts: legacy cookies no longer authenticate.
Normal and admin sessions have separate audiences/cookies; every private request
checks active status and role. New registrations cannot select an admin role.
To provision an administrator deliberately, run
`node scripts/provision-admin.mjs --email <authorized-email>` on the host.
No administrator has been provisioned automatically. No payment processing exists;
`enrollment_tier` is a future enrollment placeholder, not a billing entitlement.


## Vault and administration operations

The private-vault migration adds a durable synchronization queue. SQLite remains
canonical; account/journey/shop changes enqueue projections transactionally. The
in-process worker resumes queued work after restart, polls every 30 seconds,
processes up to 10 accounts per batch, leases work for three minutes, and retries
failures after 60 seconds. Production build initialization does not start the worker.

The default private root is `/home/ubuntu/moonlight-private-vaults`;
`MOONLIGHT_VAULT_DIR` can override it. Keep it outside the app/public tree and shared
command-center. Directories are 0700, files 0600; Git repositories are local only.
See `ops/PRIVATE-VAULT.md` for metadata-only queue inspection and recovery. Do not
serve this directory or inspect private files as routine admin diagnostics.
Owner exports via `/account` require active participant authorization and exclude
`.git`; the ZIP buffer cap is 32 MiB. Disabled accounts retain data but cannot export.
SQLite backups do not preserve historic vault Git commits; local Git alone is not
an off-host backup. Reprojection rebuilds current files, not lost Git history.

`/admin` and `/admin/users/[id]` require separate active administrator sessions.
No admin account is automatically seeded. The CLI provisioning command above is
the only initial role-assignment mechanism; public signup cannot grant admin rights.
Support is metadata-only: no transcript/message content, private vault browser,
impersonation, raw state, or owner archive access. Metric definitions and coverage
are listed in README. Telemetry starts at installation, not retroactively.
Build metrics cover the instrumented build script; API errors include 4xx as well
as 5xx. Missing denominators and unavailable payment/safety metrics are null.

Email configuration reuses the explicitly authorized existing Resend service and
verified Pegasus sender; no new external service was provisioned. A real-recipient
sign-in/recovery email has not been tested. Dedicated Moonlight sender branding
and a reliable count-only safety event contract remain decisions, not deployment
claims. Do not change `coach-prompt.js` to populate an unavailable dashboard metric.
