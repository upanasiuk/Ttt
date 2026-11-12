from database import get_conn


def get_recipient_stats(recipient_id: int):
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT t.id, t.barcode, t.attachment, t.price, t.weight_g, t.comment, t.url, t.status, t.issued_at, t.parcel_id, p.name AS parcel_name, t.quantity AS total_track_qty
            FROM tracks t
            JOIN parcels p ON p.id = t.parcel_id
            JOIN track_allocations ta ON ta.track_id = t.id
            WHERE ta.recipient_id = ?
            ORDER BY t.created_at
        """, (recipient_id,)).fetchall()

        tracks_dict = {}
        for row in rows:
            tid = row["id"]
            if tid not in tracks_dict:
                tracks_dict[tid] = {
                    "id": tid, "barcode": row["barcode"], "attachment": row["attachment"],
                    "price": row["price"], "weight_g": row["weight_g"], "comment": row["comment"],
                    "url": row["url"], "status": row["status"], "issued_at": row["issued_at"],
                    "parcel_id": row["parcel_id"], "parcel_name": row["parcel_name"],
                    "total_qty": row["total_track_qty"], "recipients": []
                }

            allocs = conn.execute("""
                SELECT r.id, r.name, ta.quantity 
                FROM track_allocations ta
                JOIN recipients r ON r.id = ta.recipient_id
                WHERE ta.track_id = ?
            """, (tid,)).fetchall()

            tracks_dict[tid]["recipients"] = [
                {"id": a["id"], "name": a["name"], "quantity": a["quantity"]} for a in allocs]

        tracks = list(tracks_dict.values())

        for t in tracks:
            my_alloc = next(
                (r for r in t["recipients"] if r["id"] == recipient_id), None)
            my_qty = my_alloc["quantity"] if my_alloc else 0
            total_qty = t["total_qty"] if t["total_qty"] and t["total_qty"] > 0 else 1
            total_price = t["price"] if t["price"] is not None else 0.0
            t["my_price"] = (total_price / total_qty) * my_qty

        issued = [t for t in tracks if t["status"] == "issued"]
        pending = [t for t in tracks if t["status"] != "issued"]

        return {
            "stats": {
                "total": len(tracks), "issued_count": len(issued), "pending_count": len(pending),
                "weight_total": sum(t["weight_g"] or 0 for t in tracks),
                "weight_unknown": sum(1 for t in tracks if t["weight_g"] is None),
                "price_total": sum(t["my_price"] for t in tracks),
            },
            "issued": issued, "pending": pending,
        }
