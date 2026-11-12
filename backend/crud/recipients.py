from database import get_conn


def get_user_by_username(username: str):
    with get_conn() as conn:
        return conn.execute("SELECT * FROM recipients WHERE username = ? AND is_deleted = 0", (username,)).fetchone()


def get_user_by_id(user_id: int):
    with get_conn() as conn:
        return conn.execute("SELECT * FROM recipients WHERE id = ? AND is_deleted = 0", (user_id,)).fetchone()


def create_user(name, username, password_hash, is_admin=0):
    with get_conn() as conn:
        conn.execute("INSERT INTO recipients (name, username, password_hash, is_admin) VALUES (?, ?, ?, ?)",
                     (name, username, password_hash, is_admin))
        conn.commit()


def update_password(user_id: int, new_hash: str):
    with get_conn() as conn:
        conn.execute(
            "UPDATE recipients SET password_hash = ? WHERE id = ?", (new_hash, user_id))
        conn.commit()


def set_admin_status(user_id: int, is_admin: int):
    with get_conn() as conn:
        conn.execute(
            "UPDATE recipients SET is_admin = ? WHERE id = ?", (is_admin, user_id))
        conn.commit()


def soft_delete_user(user_id: int):
    with get_conn() as conn:
        conn.execute(
            "UPDATE recipients SET is_deleted = 1, username = NULL, password_hash = NULL WHERE id = ?", (user_id,))
        conn.commit()


def list_recipients(is_admin: bool, current_user_id: int):
    with get_conn() as conn:
        if is_admin:
            return conn.execute("SELECT id, name, username, is_admin FROM recipients WHERE is_deleted = 0 ORDER BY is_admin DESC, name").fetchall()
        return conn.execute("SELECT id, name, username, is_admin FROM recipients WHERE id = ? AND is_deleted = 0", (current_user_id,)).fetchall()
