# Moonlight SQLite backup and restore

## Existing scheduled backups on bucket3

The `ubuntu` crontab runs `/home/ubuntu/bin/moonlight-db-backup.sh` at
`10 2 * * *` (02:10 in the host's cron timezone). That external script uses
Python's SQLite online backup API against
`/home/ubuntu/moonlight/data/moonlight.sqlite`, then gzip compression.
The online backup API includes committed WAL data consistently; a plain copy
of the main SQLite file while the app runs is not equivalent.

Backups live in `/home/ubuntu/backups/db/moonlight-YYYYMMDD-HHMM.sqlite.gz`.
The directory is mode 0700 and scheduled dumps are mode 0600. The script keeps
the 14 most recent compressed snapshots. Its log is
`/home/ubuntu/logs/moonlight-db-backup.log`. This documents existing operations;
it does not install or change cron. The script hardcodes the source path, so
an approved `MOONLIGHT_DATA_DIR` change must also update backup configuration.

## Repeatable restore verification (no live database changes)

Choose a specific scheduled gzip snapshot and run from the repository:

```sh
python3 ops/verify-db-backup.py /home/ubuntu/backups/db/moonlight-YYYYMMDD-HHMM.sqlite.gz
```

The verifier decompresses into a private temporary directory, opens only the
restored copy read-only, validates SQLite integrity, foreign keys, expected
schema and indexes, and removes the temporary files. It emits pass/fail rather
than participant records. It accepts original schema version 0 and version 1.
A successful verification does not restore production or prove application
compatibility with a different code revision.

## Controlled production restore — operator procedure, not automatic

**Do not restore into the live data directory while Moonlight is running.**
Execute a production restore only as an explicitly authorized maintenance
operation with an identified backup, compatible application revision, and
rollback plan. No other application or tunnel service needs restarting.

1. Verify the selected backup with the command above. Record its timestamp;
   restoring it will discard later production changes unless separately recovered.
2. In the maintenance window, explicitly stop **only `moonlight.service`** and
   confirm its process is stopped. Preserve the current data directory intact
   for rollback, including its main database and any WAL/SHM sidecars.
3. Decompress the selected backup into a **new private directory**, with the
   database named `moonlight.sqlite` and readable/writable by the Moonlight
   service account. Do not mix old `moonlight.sqlite-wal` or
   `moonlight.sqlite-shm` files with the restored database. Do not overwrite or
   delete the preserved original directory.
4. With the service still stopped, switch its configured data location to the
   restored directory through the approved deployment process (or replace the
   data-directory location while retaining the old directory separately).
   Ensure the backup script's source path still points at the active database.
5. Start **only `moonlight.service`**, verify application health and expected
   schema compatibility, and retain the original directory until the restore
   is accepted. If validation fails, stop Moonlight before reverting to the
   preserved directory and compatible application revision.

This procedure is documentation only. Running the verifier never stops,
starts, or modifies services and never replaces the live database.
