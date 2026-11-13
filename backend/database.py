import sqlite3
import os
from contextlib import contextmanager
from config import settings

DB_PATH = settings.db_path


def init_db():
    # Гарантируем, что папка /data/db существует
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    with get_conn() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS recipients (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT NOT NULL,
            username      TEXT UNIQUE,
            password_hash TEXT,
            is_admin      INTEGER NOT NULL DEFAULT 0,
            is_deleted    INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS parcels (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            name         TEXT NOT NULL,
            is_active    INTEGER NOT NULL DEFAULT 0,
            status       TEXT NOT NULL DEFAULT 'active',
            created_at   TEXT NOT NULL,
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tracks (
            id                 INTEGER PRIMARY KEY AUTOINCREMENT,
            barcode            TEXT UNIQUE,
            parcel_id          INTEGER NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
            attachment         TEXT,
            quantity           INTEGER,
            unit               TEXT,
            price              REAL,
            weight_g           INTEGER,
            comment            TEXT,
            url                TEXT,
            status             TEXT NOT NULL DEFAULT 'pending',
            issued_at          TEXT,
            created_at         TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS track_allocations (
            track_id     INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
            recipient_id INTEGER NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
            quantity     INTEGER NOT NULL,
            PRIMARY KEY (track_id, recipient_id)
        );

        CREATE TABLE IF NOT EXISTS track_history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id   INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
            user_id    INTEGER,
            user_name  TEXT,
            action     TEXT NOT NULL,
            details    TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id       INTEGER NOT NULL REFERENCES recipients(id),
            url           TEXT,
            description   TEXT,
            quantity      INTEGER NOT NULL DEFAULT 1,
            admin_comment TEXT,
            status        TEXT NOT NULL DEFAULT 'new',
            track_id      INTEGER REFERENCES tracks(id) ON DELETE SET NULL,
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS order_files (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            file_path  TEXT NOT NULL,
            file_type  TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tracks_parcel ON tracks(parcel_id);
        CREATE INDEX IF NOT EXISTS idx_history_track ON track_history(track_id, created_at DESC);
        """)
        conn.commit()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
    finally:
        conn.close()
