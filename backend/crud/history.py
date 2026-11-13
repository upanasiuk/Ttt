import json
from datetime import datetime, timezone
from database import get_conn


def _now(): return datetime.now(timezone.utc).isoformat()


def log_history(conn, track_id, user, action, details=None):
    conn.execute(
        "INSERT INTO track_history (track_id, user_id, user_name, action, details, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (
            track_id,
            user["id"],
            user["name"],
            action,
            json.dumps(details, ensure_ascii=False) if details else None,
            _now(),
        )
    )


def get_history(track_id: int):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, user_id, user_name, action, details, created_at FROM track_history WHERE track_id = ? ORDER BY created_at DESC",
            (track_id,)
        ).fetchall()
        result = []
        for r in rows:
            result.append({
                "id": r["id"],
                "user_id": r["user_id"],
                "user_name": r["user_name"],
                "action": r["action"],
                "details": json.loads(r["details"]) if r["details"] else None,
                "created_at": r["created_at"],
            })
        return result
