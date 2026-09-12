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
