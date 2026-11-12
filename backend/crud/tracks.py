from database import get_conn
from datetime import datetime, timezone


def _now(): return datetime.now(timezone.utc).isoformat()


def get_recipient_id_by_name(name: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM recipients WHERE name = ? AND is_deleted = 0", (name,)).fetchone()
        return row["id"] if row else None


def upsert_track(barcode, parcel_id, attachment, total_qty, unit, price, weight_g, comment, url, allocations):
    with get_conn() as conn:
        tid = None
        if barcode:
            existing = conn.execute(
                "SELECT id FROM tracks WHERE barcode = ?", (barcode,)).fetchone()
            if existing:
                tid = existing["id"]
                conn.execute("UPDATE tracks SET parcel_id=?, attachment=?, quantity=?, unit=?, price=?, weight_g=?, comment=?, url=? WHERE id=?",
                             (parcel_id, attachment, total_qty, unit, price, weight_g, comment, url, tid))
                conn.execute(
                    "DELETE FROM track_allocations WHERE track_id = ?", (tid,))

        if not tid:
            status = 'in_transit' if barcode else 'pending'
            cur = conn.execute("INSERT INTO tracks (barcode, parcel_id, attachment, quantity, unit, price, weight_g, comment, url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                               (barcode, parcel_id, attachment, total_qty, unit, price, weight_g, comment, url, status, _now()))
            tid = cur.lastrowid

        for alloc in allocations:
            rid = get_recipient_id_by_name(alloc.recipient_name)
            conn.execute(
                "INSERT INTO track_allocations (track_id, recipient_id, quantity) VALUES (?, ?, ?)", (tid, rid, alloc.quantity))

        conn.commit()


def update_track(track_id, payload, allocations, new_qty, barcode, attachment, unit, comment, url, new_status):
    with get_conn() as conn:
        if allocations is not None:
            conn.execute(
                "DELETE FROM track_allocations WHERE track_id = ?", (track_id,))
            for alloc in allocations:
                rid = get_recipient_id_by_name(alloc.recipient_name)
                conn.execute(
                    "INSERT INTO track_allocations (track_id, recipient_id, quantity) VALUES (?, ?, ?)", (track_id, rid, alloc.quantity))

        row = conn.execute(
            "SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
        conn.execute("""
            UPDATE tracks SET barcode=?, parcel_id=?, attachment=?, quantity=?, unit=?, price=?, weight_g=?, comment=?, url=?, status=? WHERE id=?
        """, (barcode, payload.parcel_id or row["parcel_id"], attachment, new_qty, unit,
              payload.price if payload.price is not None else row["price"],
              payload.weight_g if payload.weight_g is not None else row["weight_g"],
              comment, url, new_status, track_id))
        conn.commit()


def delete_track(track_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
        conn.commit()


def issue_track(track_id: int):
    with get_conn() as conn:
        conn.execute(
            "UPDATE tracks SET status = 'issued', issued_at = ? WHERE id = ?", (_now(), track_id))
        conn.commit()


def update_weight(track_id: int, weight_g: int):
    with get_conn() as conn:
        conn.execute("UPDATE tracks SET weight_g = ? WHERE id = ?",
                     (weight_g, track_id))
        conn.commit()
