#!/usr/bin/env python3
"""Validate a gzip SQLite backup using a private, disposable disk restore.
Usage: python3 ops/verify-db-backup.py /path/to/moonlight-TIMESTAMP.sqlite.gz
Never opens the live database or emits participant content.
"""
import argparse
import gzip
import os
from pathlib import Path
import shutil
import sqlite3
import tempfile


def verify(path):
    with tempfile.TemporaryDirectory(prefix="moonlight-restore-check-") as directory:
        os.chmod(directory, 0o700)
        restored = Path(directory) / "restore.sqlite"
        with gzip.open(path, "rb") as source, restored.open("xb") as destination:
            os.chmod(restored, 0o600)
            shutil.copyfileobj(source, destination)
        connection = sqlite3.connect(restored.as_uri() + "?mode=ro", uri=True)
        try:
            connection.execute("PRAGMA query_only=ON")
            if connection.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
                raise ValueError("SQLite integrity check failed")
            if connection.execute("PRAGMA foreign_key_check").fetchone() is not None:
                raise ValueError("SQLite foreign key check failed")
            expected = {
                "participants": {"id", "display_name", "public_name", "lang", "email", "created_at", "last_active_at"},
                "participant_state": {"participant_id", "state_json", "updated_at"},
                "shops": {"participant_id", "handle", "shop_json", "updated_at"},
                "timeline": {"id", "participant_id", "kind", "summary", "data_json", "created_at"},
            }
            for table, columns in expected.items():
                actual = {row[1] for row in connection.execute(f"PRAGMA table_info({table})")}
                if not columns <= actual:
                    raise ValueError("Backup schema check failed")
            for index, expected_columns in (("shops_participant_idx", ["participant_id"]), ("timeline_participant_idx", ["participant_id", "created_at"])):
                actual = [row[2] for row in connection.execute(f"PRAGMA index_info({index})")]
                if actual != expected_columns:
                    raise ValueError("Backup index check failed")
            version = connection.execute("PRAGMA user_version").fetchone()[0]
            if version not in (0, 1):
                raise ValueError("Unsupported backup schema version")
        finally:
            connection.close()
    print("PASS: disposable restore, integrity, foreign keys, schema, and indexes; temporary files removed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path)
    args = parser.parse_args()
    try:
        verify(args.backup)
    except (OSError, sqlite3.Error, ValueError, EOFError):
        parser.exit(1, "FAIL: backup restore validation failed; no record contents emitted\n")
