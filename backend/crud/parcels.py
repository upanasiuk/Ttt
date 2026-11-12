from database import get_conn
from datetime import datetime, timezone


def _now(): return datetime.now(timezone.utc).isoformat()


def get_active_parcel():
    with get_conn() as conn:
        return conn.execute("SELECT id, name FROM parcels WHERE is_active = 1 LIMIT 1").fetchone()


def set_active_parcel(parcel_id: int):
    with get_conn() as conn:
        conn.execute("UPDATE parcels SET is_active = 0")
        conn.execute(
            "UPDATE parcels SET is_active = 1 WHERE id = ?", (parcel_id,))
        conn.commit()


def create_parcel(name: str):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO parcels (name, status, created_at) VALUES (?, 'active', ?)", (name, _now()))
        if not conn.execute("SELECT id FROM parcels WHERE is_active = 1").fetchone():
            conn.execute(
                "UPDATE parcels SET is_active = 1 WHERE id = ?", (cur.lastrowid,))
        conn.commit()
        return cur.lastrowid


def update_parcel_status(parcel_id: int, status: str):
    with get_conn() as conn:
        completed_at = _now() if status == "completed" else None
        conn.execute("UPDATE parcels SET status = ?, completed_at = ? WHERE id = ?",
                     (status, completed_at, parcel_id))

        if status == "completed":
            conn.execute(
                "UPDATE tracks SET status = 'received_cargo' WHERE parcel_id = ? AND status = 'pending'", (parcel_id,))

        conn.commit()


def delete_parcel(parcel_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM parcels WHERE id = ?", (parcel_id,))
        conn.commit()


def get_parcel_name(parcel_id: int):
    with get_conn() as conn:
        return conn.execute("SELECT name FROM parcels WHERE id = ?", (parcel_id,)).fetchone()
