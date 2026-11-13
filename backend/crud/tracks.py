from database import get_conn
from datetime import datetime, timezone
from crud.history import log_history


def _now(): return datetime.now(timezone.utc).isoformat()


def get_recipient_id_by_name(name: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM recipients WHERE name = ? AND is_deleted = 0", (name,)).fetchone()
        return row["id"] if row else None


def get_recipient_id_by_name_any(name: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM recipients WHERE name = ?", (name,)).fetchone()
        return row["id"] if row else None


def _track_snapshot(row):
    if not row:
        return None
    return {
        "barcode": row["barcode"],
        "parcel_id": row["parcel_id"],
        "attachment": row["attachment"],
        "quantity": row["quantity"],
        "unit": row["unit"],
        "price": row["price"],
        "weight_g": row["weight_g"],
        "comment": row["comment"],
        "url": row["url"],
        "status": row["status"],
    }


def _allocations_map(conn, track_id):
    rows = conn.execute(
        "SELECT recipient_id, quantity FROM track_allocations WHERE track_id = ?",
        (track_id,)
    ).fetchall()
    return {r["recipient_id"]: r["quantity"] for r in rows}


def upsert_track(barcode, parcel_id, attachment, total_qty, unit, price, weight_g, comment, url, allocations, user):
    with get_conn() as conn:
        tid = None
        is_update = False
        old_snapshot = None
        old_allocs = {}

        if barcode:
            existing = conn.execute(
                "SELECT * FROM tracks WHERE barcode = ?", (barcode,)).fetchone()
            if existing:
                tid = existing["id"]
                is_update = True
                old_snapshot = _track_snapshot(existing)
                old_allocs = _allocations_map(conn, tid)
                conn.execute(
                    "UPDATE tracks SET parcel_id=?, attachment=?, quantity=?, unit=?, price=?, weight_g=?, comment=?, url=? WHERE id=?",
                    (parcel_id, attachment, total_qty, unit, price, weight_g, comment, url, tid))
                conn.execute(
                    "DELETE FROM track_allocations WHERE track_id = ?", (tid,))

        if not tid:
            status = 'in_transit' if barcode else 'pending'
            cur = conn.execute(
                "INSERT INTO tracks (barcode, parcel_id, attachment, quantity, unit, price, weight_g, comment, url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (barcode, parcel_id, attachment, total_qty, unit, price, weight_g, comment, url, status, _now()))
            tid = cur.lastrowid

        added_count = 0
        for alloc in allocations:
            rid = get_recipient_id_by_name(alloc.recipient_name)
            if not rid:
                continue
            conn.execute(
                "INSERT INTO track_allocations (track_id, recipient_id, quantity) VALUES (?, ?, ?) ON CONFLICT(track_id, recipient_id) DO UPDATE SET quantity=excluded.quantity",
                (tid, rid, alloc.quantity)
            )
            added_count += 1

        if added_count == 0:
            conn.rollback()
            raise ValueError(
                "Ни один из указанных получателей не найден в справочнике.")

        new_row = conn.execute(
            "SELECT * FROM tracks WHERE id = ?", (tid,)).fetchone()
        new_snapshot = _track_snapshot(new_row)
        new_allocs = _allocations_map(conn, tid)

        if is_update:
            changes = {}
            for k in new_snapshot:
                if old_snapshot.get(k) != new_snapshot.get(k):
                    changes[k] = {"from": old_snapshot.get(
                        k), "to": new_snapshot.get(k)}
            if old_allocs != new_allocs:
                changes["allocations"] = {"from": old_allocs, "to": new_allocs}
            log_history(conn, tid, user, "updated", changes)
        else:
            log_history(conn, tid, user, "created", {"snapshot": new_snapshot})

        conn.commit()


def update_track(track_id, payload, allocations, new_qty, barcode, attachment, unit, comment, url, new_status, user):
    with get_conn() as conn:
        old_row = conn.execute(
            "SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
        if not old_row:
            return

        old_snapshot = _track_snapshot(old_row)
        old_allocs = _allocations_map(conn, track_id)

        if allocations is not None:
            conn.execute(
                "DELETE FROM track_allocations WHERE track_id = ?", (track_id,))
            added_count = 0
            for alloc in allocations:
                rid = get_recipient_id_by_name_any(alloc.recipient_name)
                if not rid:
                    continue
                conn.execute(
                    "INSERT INTO track_allocations (track_id, recipient_id, quantity) VALUES (?, ?, ?) ON CONFLICT(track_id, recipient_id) DO UPDATE SET quantity=excluded.quantity",
                    (track_id, rid, alloc.quantity)
                )
                added_count += 1

            if added_count == 0:
                conn.rollback()
                raise ValueError(
                    "Ни один из указанных получателей не найден в справочнике.")

        old_qty = old_row["quantity"] or 1
        new_price = payload.price if payload.price is not None else old_row["price"]

        if new_qty != old_qty and new_price is not None:
            price_per_unit = (old_row["price"] or 0) / old_qty
            new_price = price_per_unit * new_qty

        conn.execute("""
            UPDATE tracks SET barcode=?, parcel_id=?, attachment=?, quantity=?, unit=?, price=?, weight_g=?, comment=?, url=?, status=? WHERE id=?
        """, (barcode, payload.parcel_id or old_row["parcel_id"], attachment, new_qty, unit,
              new_price,
              payload.weight_g if payload.weight_g is not None else old_row["weight_g"],
              comment, url, new_status, track_id))

        new_row = conn.execute(
            "SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
        new_snapshot = _track_snapshot(new_row)
        new_allocs = _allocations_map(conn, track_id)

        changes = {}
        for k in new_snapshot:
            if old_snapshot.get(k) != new_snapshot.get(k):
                changes[k] = {"from": old_snapshot.get(
                    k), "to": new_snapshot.get(k)}
        if old_allocs != new_allocs:
            changes["allocations"] = {"from": old_allocs, "to": new_allocs}

        if changes:
            log_history(conn, track_id, user, "updated", changes)

        conn.commit()


def delete_track(track_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
        conn.commit()


def issue_track(track_id: int, user):
    with get_conn() as conn:
        old = conn.execute(
            "SELECT status FROM tracks WHERE id = ?", (track_id,)).fetchone()
        if not old:
            return
        conn.execute(
            "UPDATE tracks SET status = 'issued', issued_at = ? WHERE id = ?",
            (_now(), track_id))
        if old["status"] != "issued":
            log_history(conn, track_id, user, "issued",
                        {"status": {"from": old["status"], "to": "issued"}})
        conn.commit()


def update_weight(track_id: int, weight_g: int, user):
    with get_conn() as conn:
        old = conn.execute(
            "SELECT weight_g FROM tracks WHERE id = ?", (track_id,)).fetchone()
        if not old:
            return
        conn.execute("UPDATE tracks SET weight_g = ? WHERE id = ?",
                     (weight_g, track_id))
        if old["weight_g"] != weight_g:
            log_history(conn, track_id, user, "weighed",
                        {"weight_g": {"from": old["weight_g"], "to": weight_g}})
        conn.commit()
