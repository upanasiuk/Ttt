import sqlite3
from contextlib import contextmanager
from config import settings

DB_PATH = settings.db_path

def init_db():
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

        CREATE INDEX IF NOT EXISTS idx_tracks_parcel ON tracks(parcel_id);
        """)
        conn.commit()


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=20) # Увеличен таймаут
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    # Включаем WAL-режим для параллельных чтений/записей
    conn.execute("PRAGMA journal_mode = WAL")
    try:
        yield conn
    finally:
        conn.close()