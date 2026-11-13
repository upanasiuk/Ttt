from database import get_conn
from datetime import datetime, timezone
import os
from config import settings


def _now(): return datetime.now(timezone.utc).isoformat()


def create_order(user_id, url, description, quantity):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO orders (user_id, url, description, quantity, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'new', ?, ?)",
            (user_id, url, description, quantity, _now(), _now())
        )
        conn.commit()
        return cur.lastrowid


def add_file(order_id, file_path, file_type):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO order_files (order_id, file_path, file_type, created_at) VALUES (?, ?, ?, ?)",
            (order_id, file_path, file_type, _now())
        )
        conn.commit()


def get_orders(user_id=None, is_admin=False):
    with get_conn() as conn:
        query = """
            SELECT o.*, r.name AS user_name,
                   t.status AS track_status, t.barcode AS track_barcode, t.attachment AS track_attachment
            FROM orders o
            JOIN recipients r ON r.id = o.user_id
            LEFT JOIN tracks t ON t.id = o.track_id
            WHERE 1=1
        """
        args = []
        if not is_admin:
            query += " AND o.user_id = ?"
            args.append(user_id)
        query += " ORDER BY o.created_at DESC"

        orders = conn.execute(query, args).fetchall()
        result = []
        for o in orders:
            files = conn.execute(
                "SELECT id, file_path, file_type FROM order_files WHERE order_id = ?", (o["id"],)).fetchall()
            order_dict = dict(o)
            order_dict["files"] = [dict(f) for f in files]
            result.append(order_dict)
        return result


def get_order_by_id(order_id):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return dict(row) if row else None


def update_order_status(order_id, status, admin_comment=None):
    with get_conn() as conn:
        conn.execute(
            "UPDATE orders SET status = ?, admin_comment = COALESCE(?, admin_comment), updated_at = ? WHERE id = ?",
            (status, admin_comment, _now(), order_id)
        )
        conn.commit()


def mark_link_clicked(order_id):
    with get_conn() as conn:
        conn.execute(
            "UPDATE orders SET status = 'ordered', updated_at = ? WHERE id = ? AND status = 'new'",
            (_now(), order_id)
        )
        conn.commit()


def attach_track_to_order(order_id, track_id):
    with get_conn() as conn:
        conn.execute(
            "UPDATE orders SET track_id = ?, status = 'track_created', updated_at = ? WHERE id = ?",
            (track_id, _now(), order_id)
        )
        conn.commit()


def delete_order(order_id):
    with get_conn() as conn:
        files = conn.execute(
            "SELECT file_path FROM order_files WHERE order_id = ?", (order_id,)).fetchall()
        for f in files:
            try:
                full_path = os.path.join(settings.uploads_dir, f["file_path"])
                if os.path.exists(full_path):
                    os.remove(full_path)
                thumb_path = os.path.join(
                    settings.uploads_dir, f"thumb_{f['file_path']}")
                if os.path.exists(thumb_path):
                    os.remove(thumb_path)
            except Exception:
                pass
        conn.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        conn.commit()
