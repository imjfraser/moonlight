# Private participant vaults

## Ownership and source of truth

SQLite remains the live authoritative store. Each registered user account owns a
local Git-versioned Markdown projection, keyed by its canonical participant UUID.
No data is read back from Markdown into the application. Admin-only accounts do
not get participant vaults. Disabled accounts retain their data but cannot export.

Default directory: `/home/ubuntu/moonlight-private-vaults` when the application
runs from `/home/ubuntu/moonlight`. `MOONLIGHT_VAULT_DIR` overrides this private
root. Keep it outside source control, `public/`, `.next/`, and shared
command-center folders. Directories are mode 0700; generated files are mode 0600.

Each participant directory contains:

- `profile.md`: supported existing profile fields.
- `business.md`: saved offer, plan, existing artifacts, and validated owned shop
  content, including sections/contact and existing inline images.
- `timeline.md`: stored milestones; no invented decisions.
- `conversation.md`: actual saved conversation in source order; no invented
  per-message timestamps.
- `manifest.json`: projection version and file/source hashes.
- `.git/`: local version history; no remote or automatic push is configured.

The private vault contains participant content. It is not an admin support view.

## Durable synchronization

Migration version 3 adds `participant_vault_sync` and seeds registered user
accounts. Account creation/meaningful changes, changed journey saves, and changed
shop saves enqueue a generation within the same SQLite transaction. Reads and
last-active refreshes do not enqueue; an identical save does not create a commit.

`getDb()` starts one Node worker per process after migration and singleton
assignment, except during the production build phase. The worker polls every
30 seconds, processes up to 10 accounts per batch, uses a three-minute database
lease per account, and retries failed syncs after 60 seconds. It reads a
consistent SQLite snapshot and does filesystem/Git work outside the transaction.
A later queued generation is not cleared by an earlier export completing.

No additional system service or cron is required. A restart of the authorized
Moonlight application resumes the durable queue. Failed workers must not log
raw content or raw Git errors; operational error fields contain sanitized codes.

Useful metadata-only inspection:

```sql
SELECT participant_id, requested_generation, completed_generation,
       lease_until, synced_at, last_error_code, attempts, next_retry_at
FROM participant_vault_sync;
```

A pending generation is normal briefly after a save. A persistent gap plus
`sync_failed` calls for checking directory ownership, disk space, Git availability,
and the worker. Do not inspect participant content as routine admin diagnostics.

## Participant download

`/account` offers `/api/vault/export`. The endpoint requires an active user session,
derives the participant id on the server, synchronizes pending work, and rechecks
session authorization after asynchronous export work. It returns a ZIP of the
committed allowlisted Markdown/manifest files, not the working tree or `.git`
history. A still-pending or failed export returns a sanitized unavailable response;
retry after synchronization completes. The archive is limited to 32 MiB of
buffered ZIP output. Large collections of images may exceed that export limit.

Never accept an arbitrary participant id from query parameters for this endpoint.
Never expose the private root as a static directory. Do not add admin impersonation
or an admin vault-file/Git-history/archive endpoint.

## Admin support boundary

Admin account support is a separately constructed metadata allowlist: account
status, timestamps, counts/progress enums, and synchronization health. It must not
return profile/business text, state JSON, conversation text, drafted messages,
free-form timeline fields, raw vault files, Git differences/history, or private ZIP
exports. Use synthetic marker tests to verify absence across every admin response.

## Operations and verification

SQLite backups remain required; local Git history is not the live database or a
replacement for the WAL-aware backups documented in `ops/BACKUP.md`. Rebuilding a
vault restores a current projection from SQLite, not prior Git history. Account
disablement revokes access; it is not erasure of SQLite records or Git history.

Focused verification uses `npm test`; vault tests create only synthetic in-memory
databases and disposable temporary Git directories. They cover owner isolation,
path safety, content-free admin projection, retries, concurrent queue generations,
idempotent commits, and revoked-account exports. No provider calls or production
participant records are needed.
