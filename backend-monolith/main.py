import tempfile
import sqlite3
import urllib.parse
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer

import jwt
from jwt.exceptions import InvalidTokenError

from pwdlib import PasswordHash
from starlette.concurrency import run_in_threadpool
from starlette.background import BackgroundTask

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side

from config import settings
from database import init_db, get_conn
from models import (
    LoginData, SetupAdmin, PasswordChangeSelf, PasswordChangeAdmin,
    ParcelCreate, RecipientCreate, TrackUpsert, TrackUpdate, WeightUpdate,
)

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Трекер посылок", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url=None)

# Middleware для авто-продления токена (Sliding Session)


@app.middleware("http")
async def refresh_token_middleware(request: Request, call_next):
    response = await call_next(request)

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[
                                 settings.algorithm])
            exp = payload.get("exp")
            if exp:
                now = datetime.now(timezone.utc).timestamp()
                time_left = exp - now
                total_time = settings.access_token_expire_minutes * 60

                if time_left < (total_time / 2) and time_left > 0:
                    user_id = payload.get("sub")
                    if user_id:
                        new_token = jwt.encode({"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(
                            minutes=settings.access_token_expire_minutes)}, settings.jwt_secret_key, algorithm=settings.algorithm)
                        response.headers["X-Refresh-Token"] = new_token
        except InvalidTokenError:
            pass

    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Refresh-Token"]
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_current_user(token: Annotated[str | None, Depends(oauth2_scheme)]):
    if not token:
        raise HTTPException(status_code=401, detail="No token")
    try:
        payload = jwt.decode(token, settings.jwt_secret_key,
                             algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    with get_conn() as conn:
        user = conn.execute(
            "SELECT * FROM recipients WHERE id = ? AND is_deleted = 0", (user_id,)).fetchone()
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(user)


def get_admin_user(current_user: Annotated[dict, Depends(get_current_user)]):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin rights required")
    return current_user


def get_super_admin(current_user: Annotated[dict, Depends(get_admin_user)]):
    if current_user["id"] != 1:
        raise HTTPException(
            status_code=403, detail="Только главный администратор может выполнять это действие")
    return current_user


# =====================================================================
#  АВТОРИЗАЦИЯ
# =====================================================================
@app.get("/api/config")
async def get_config(): return {"backend_url": settings.backend_url}


@app.get("/api/check_setup")
def check_setup():
    with get_conn() as conn:
        return {"is_setup": conn.execute("SELECT COUNT(*) FROM recipients").fetchone()[0] > 0}


@app.post("/api/setup")
async def setup_admin(payload: SetupAdmin):
    def _setup():
        with get_conn() as conn:
            if conn.execute("SELECT COUNT(*) FROM recipients").fetchone()[0] > 0:
                raise HTTPException(400, "Система уже настроена")
            conn.execute("INSERT INTO recipients (name, username, password_hash, is_admin) VALUES (?, ?, ?, 1)",
                         (payload.name, payload.username, password_hash.hash(payload.password)))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_setup)


@app.post("/api/login")
async def login(payload: LoginData):
    def _login():
        with get_conn() as conn:
            user = conn.execute(
                "SELECT * FROM recipients WHERE username = ? AND is_deleted = 0", (payload.username,)).fetchone()
            if not user or not password_hash.verify(payload.password, user["password_hash"]):
                raise HTTPException(400, "Неверный логин или пароль")
            token = jwt.encode({"sub": str(user["id"]), "exp": datetime.now(timezone.utc) + timedelta(
                minutes=settings.access_token_expire_minutes)}, settings.jwt_secret_key, algorithm=settings.algorithm)
            return {"access_token": token, "user": {"id": user["id"], "name": user["name"], "is_admin": bool(user["is_admin"])}}
    return await run_in_threadpool(_login)


@app.get("/api/me")
async def read_users_me(current_user: Annotated[dict, Depends(get_current_user)]):
    return {"id": current_user["id"], "name": current_user["name"], "is_admin": bool(current_user["is_admin"])}


@app.post("/api/change_password")
async def change_password(payload: PasswordChangeSelf, current_user: Annotated[dict, Depends(get_current_user)]):
    def _change():
        with get_conn() as conn:
            user = conn.execute(
                "SELECT password_hash FROM recipients WHERE id = ?", (current_user["id"],)).fetchone()
            if not password_hash.verify(payload.old_password, user["password_hash"]):
                raise HTTPException(400, "Старый пароль неверен")
            conn.execute("UPDATE recipients SET password_hash = ? WHERE id = ?",
                         (password_hash.hash(payload.new_password), current_user["id"]))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_change)


@app.post("/api/recipients/{recipient_id}/password")
async def admin_change_password(recipient_id: int, payload: PasswordChangeAdmin, current_user: Annotated[dict, Depends(get_super_admin)]):
    def _change():
        with get_conn() as conn:
            if not conn.execute("SELECT id FROM recipients WHERE id = ?", (recipient_id,)).fetchone():
                raise HTTPException(404, "Пользователь не найден")
            conn.execute("UPDATE recipients SET password_hash = ? WHERE id = ?",
                         (password_hash.hash(payload.new_password), recipient_id))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_change)


@app.post("/api/recipients/{recipient_id}/promote")
async def promote_recipient(recipient_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _promote():
        with get_conn() as conn:
            user = conn.execute(
                "SELECT id, is_admin FROM recipients WHERE id = ? AND is_deleted = 0", (recipient_id,)).fetchone()
            if not user:
                raise HTTPException(404, "Пользователь не найден")
            if user["is_admin"]:
                raise HTTPException(
                    400, "Пользователь уже является администратором")

            conn.execute(
                "UPDATE recipients SET is_admin = 1 WHERE id = ?", (recipient_id,))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_promote)


@app.post("/api/recipients/{recipient_id}/demote")
async def demote_recipient(recipient_id: int, current_user: Annotated[dict, Depends(get_super_admin)]):
    def _demote():
        with get_conn() as conn:
            if recipient_id == current_user["id"]:
                raise HTTPException(
                    400, "Вы не можете отозвать права администратора у самого себя")

            user = conn.execute(
                "SELECT id, is_admin FROM recipients WHERE id = ? AND is_deleted = 0", (recipient_id,)).fetchone()
            if not user:
                raise HTTPException(404, "Пользователь не найден")
            if not user["is_admin"]:
                raise HTTPException(
                    400, "Пользователь не является администратором")

            conn.execute(
                "UPDATE recipients SET is_admin = 0 WHERE id = ?", (recipient_id,))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_demote)


# =====================================================================
#  ПАРТИИ
# =====================================================================
def _get_active_parcel(conn):
    return conn.execute("SELECT id, name FROM parcels WHERE is_active = 1 LIMIT 1").fetchone()


def _set_active_parcel(conn, parcel_id: int):
    conn.execute("UPDATE parcels SET is_active = 0")
    conn.execute("UPDATE parcels SET is_active = 1 WHERE id = ?", (parcel_id,))


def _get_recipient_id(conn, name: str) -> int:
    row = conn.execute(
        "SELECT id FROM recipients WHERE name = ? AND is_deleted = 0", (name,)).fetchone()
    if row:
        return row["id"]
    raise HTTPException(400, f"Получатель '{name}' не найден.")


@app.get("/api/parcels")
async def list_parcels(current_user: Annotated[dict, Depends(get_current_user)]):
    def _list():
        with get_conn() as conn:
            parcels = conn.execute(
                "SELECT * FROM parcels ORDER BY created_at DESC").fetchall()
            result = []
            for p in parcels:
                query = """
                    SELECT t.id, t.barcode, t.status, t.attachment, t.quantity, t.unit, t.price, t.weight_g, t.comment, t.url, t.issued_at,
                           ta.recipient_id, r.name AS recipient, ta.quantity AS rec_qty
                    FROM tracks t
                    JOIN track_allocations ta ON ta.track_id = t.id
                    JOIN recipients r ON r.id = ta.recipient_id
                    WHERE t.parcel_id = ?
                """
                args = [p["id"]]
                if not current_user["is_admin"]:
                    query += " AND ta.recipient_id = ?"
                    args.append(current_user["id"])

                rows = conn.execute(query, args).fetchall()
                tracks_dict = {}
                for row in rows:
                    tid = row["id"]
                    if tid not in tracks_dict:
                        tracks_dict[tid] = {
                            "id": tid, "barcode": row["barcode"], "status": row["status"],
                            "attachment": row["attachment"], "quantity": row["quantity"], "unit": row["unit"],
                            "price": row["price"], "weight_g": row["weight_g"], "comment": row["comment"], "url": row["url"],
                            "issued_at": row["issued_at"], "recipients": []
                        }
                    tracks_dict[tid]["recipients"].append({
                        "id": row["recipient_id"], "name": row["recipient"], "quantity": row["rec_qty"]
                    })

                if not current_user["is_admin"] and not tracks_dict:
                    continue

                result.append({
                    "id": p["id"], "name": p["name"], "is_active": bool(p["is_active"]), "status": p["status"],
                    "created_at": p["created_at"], "completed_at": p["completed_at"],
                    "tracks": list(tracks_dict.values()),
                })
            return result
    return await run_in_threadpool(_list)


@app.post("/api/parcels")
async def create_parcel(payload: ParcelCreate, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _create():
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO parcels (name, status, created_at) VALUES (?, 'active', ?)", (payload.name, _now()))
            if not _get_active_parcel(conn):
                _set_active_parcel(conn, cur.lastrowid)
            conn.commit()
            return {"ok": True}
    return await run_in_threadpool(_create)


@app.post("/api/parcels/{parcel_id}/activate")
async def activate_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _activate():
        with get_conn() as conn:
            _set_active_parcel(conn, parcel_id)
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_activate)


@app.post("/api/parcels/{parcel_id}/complete")
async def complete_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _complete():
        with get_conn() as conn:
            conn.execute(
                "UPDATE parcels SET status = 'completed', completed_at = ? WHERE id = ?", (_now(), parcel_id))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_complete)


@app.post("/api/parcels/{parcel_id}/reopen")
async def reopen_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _reopen():
        with get_conn() as conn:
            conn.execute(
                "UPDATE parcels SET status = 'active', completed_at = NULL WHERE id = ?", (parcel_id,))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_reopen)


@app.delete("/api/parcels/{parcel_id}")
async def delete_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _delete():
        with get_conn() as conn:
            conn.execute("DELETE FROM parcels WHERE id = ?", (parcel_id,))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_delete)


# =====================================================================
#  ЭКСПОРТ В EXCEL
# =====================================================================
@app.get("/api/parcels/{parcel_id}/export")
async def export_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _export():
        with get_conn() as conn:
            parcel = conn.execute(
                "SELECT name FROM parcels WHERE id = ?", (parcel_id,)).fetchone()
            if not parcel:
                raise HTTPException(404, "Parcel not found")

            tracks = conn.execute(
                "SELECT t.attachment, t.quantity, t.unit, t.price FROM tracks t WHERE t.parcel_id = ? AND t.status = 'received_cargo'", (parcel_id,)).fetchall()

        grouped = {}
        for t in tracks:
            key = (t["attachment"] or "Без названия", t["unit"] or "шт")
            if key not in grouped:
                grouped[key] = {"attachment": key[0],
                                "unit": key[1], "quantity": 0, "price": 0.0}
            grouped[key]["quantity"] += (t["quantity"] or 0)
            grouped[key]["price"] += (t["price"] or 0.0)

        final_items = list(grouped.values())
        wb = Workbook()
        ws = wb.active
        ws.title = "Опись"
        font_main = Font(name="Calibri", size=10)
        border_thin = Border(left=Side(style='thin'), right=Side(
            style='thin'), top=Side(style='thin'), bottom=Side(style='thin'))

        ws['A1'] = "Опись груза:"
        ws['A1'].font = font_main
        ws.merge_cells('A1:E1')

        headers = ["№", "Наименование товара", "Кол-во единиц",
                   "Единица измерения", "Общая стоимость в бел. рублях"]
        for col, text in enumerate(headers, start=1):
            ws.cell(row=2, column=col, value=text).font = font_main
            ws.cell(row=2, column=col).border = border_thin

        for i, item in enumerate(final_items, start=3):
            ws.cell(row=i, column=1, value=i-2).font = font_main
            ws.cell(row=i, column=2, value=item["attachment"]).font = font_main
            ws.cell(row=i, column=3, value=item["quantity"]).font = font_main
            ws.cell(row=i, column=4, value=item["unit"]).font = font_main
            price_cell = ws.cell(row=i, column=5, value=item["price"])
            price_cell.font = font_main
            price_cell.number_format = '#,##0.00'
            for c in range(1, 6):
                ws.cell(row=i, column=c).border = border_thin

        last_row = len(final_items) + 3
        ws.cell(row=last_row, column=2,
                value="Итоговая стоимость:").font = font_main
        total_cell = ws.cell(
            row=last_row, column=5, value=f"=SUM(E3:E{last_row-1})" if final_items else "=0")
        total_cell.font = font_main
        total_cell.number_format = '#,##0.00'
        for c in range(1, 6):
            ws.cell(row=last_row, column=c).border = border_thin

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
        wb.save(tmp.name)
        tmp.close()
        return tmp.name, parcel["name"]

    file_path, parcel_name = await run_in_threadpool(_export)
    safe_name = urllib.parse.quote(f"Опись_{parcel_name}.xlsx")
    return FileResponse(path=file_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        headers={
                            "Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}"},
                        background=BackgroundTask(lambda: os.remove(file_path)))


# =====================================================================
#  ТРЕКИ
# =====================================================================
@app.get("/api/tracks")
async def list_tracks(parcel_id: Optional[int] = None, status: Optional[str] = None, current_user: Annotated[dict, Depends(get_current_user)] = None):
    def _list():
        with get_conn() as conn:
            query = """
                SELECT t.id, t.barcode, t.status, t.attachment, t.quantity, t.unit, t.price, t.weight_g, t.comment, t.url, t.issued_at,
                       t.parcel_id, p.name AS parcel_name,
                       ta.recipient_id, r.name AS recipient, ta.quantity AS rec_qty
                FROM tracks t
                JOIN parcels p ON p.id = t.parcel_id
                JOIN track_allocations ta ON ta.track_id = t.id
                JOIN recipients r ON r.id = ta.recipient_id
                WHERE 1=1
            """
            args = []
            if not current_user["is_admin"]:
                query += " AND ta.recipient_id = ?"
                args.append(current_user["id"])
            if parcel_id:
                query += " AND t.parcel_id = ?"
                args.append(parcel_id)
            if status:
                query += " AND t.status = ?"
                args.append(status)

            rows = conn.execute(query, args).fetchall()
            tracks_dict = {}
            for row in rows:
                tid = row["id"]
                if tid not in tracks_dict:
                    tracks_dict[tid] = {
                        "id": tid, "barcode": row["barcode"], "status": row["status"],
                        "attachment": row["attachment"], "quantity": row["quantity"], "unit": row["unit"],
                        "price": row["price"], "weight_g": row["weight_g"], "comment": row["comment"], "url": row["url"],
                        "issued_at": row["issued_at"], "parcel_id": row["parcel_id"], "parcel_name": row["parcel_name"],
                        "recipients": []
                    }
                tracks_dict[tid]["recipients"].append({
                    "id": row["recipient_id"], "name": row["recipient"], "quantity": row["rec_qty"]
                })
            return list(tracks_dict.values())
    return await run_in_threadpool(_list)


@app.post("/api/tracks")
async def upsert_track(payload: TrackUpsert, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _upsert():
        with get_conn() as conn:
            parcel_id = payload.parcel_id or _get_active_parcel(conn)["id"]
            total_qty = sum(a.quantity for a in payload.allocations)
            barcode = payload.barcode.strip() if payload.barcode and payload.barcode.strip() else None

            if barcode:
                existing = conn.execute(
                    "SELECT id FROM tracks WHERE barcode = ?", (barcode,)).fetchone()
                if existing:
                    tid = existing["id"]
                    conn.execute("UPDATE tracks SET parcel_id=?, attachment=?, quantity=?, unit=?, price=?, weight_g=?, comment=?, url=? WHERE id=?",
                                 (parcel_id, payload.attachment, total_qty, payload.unit, payload.price, payload.weight_g, payload.comment, payload.url, tid))
                    conn.execute(
                        "DELETE FROM track_allocations WHERE track_id = ?", (tid,))
                else:
                    cur = conn.execute("INSERT INTO tracks (barcode, parcel_id, attachment, quantity, unit, price, weight_g, comment, url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_transit', ?)",
                                       (barcode, parcel_id, payload.attachment, total_qty, payload.unit, payload.price, payload.weight_g, payload.comment, payload.url, _now()))
                    tid = cur.lastrowid
            else:
                cur = conn.execute("INSERT INTO tracks (parcel_id, attachment, quantity, unit, price, weight_g, comment, url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)",
                                   (parcel_id, payload.attachment, total_qty, payload.unit, payload.price, payload.weight_g, payload.comment, payload.url, _now()))
                tid = cur.lastrowid

            for alloc in payload.allocations:
                rid = _get_recipient_id(conn, alloc.recipient_name)
                conn.execute(
                    "INSERT INTO track_allocations (track_id, recipient_id, quantity) VALUES (?, ?, ?)", (tid, rid, alloc.quantity))

            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_upsert)


@app.put("/api/tracks/{track_id}")
async def update_track(track_id: int, payload: TrackUpdate, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _update():
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
            if not row:
                raise HTTPException(404, "Track not found")

            parcel_id = payload.parcel_id if payload.parcel_id is not None else row["parcel_id"]

            new_qty = row["quantity"]
            if payload.allocations is not None:
                new_qty = sum(a.quantity for a in payload.allocations)
                conn.execute(
                    "DELETE FROM track_allocations WHERE track_id = ?", (track_id,))
                for alloc in payload.allocations:
                    rid = _get_recipient_id(conn, alloc.recipient_name)
                    conn.execute(
                        "INSERT INTO track_allocations (track_id, recipient_id, quantity) VALUES (?, ?, ?)", (track_id, rid, alloc.quantity))

            new_status = payload.status or row["status"]
            if row["barcode"] is None and payload.barcode and payload.barcode.strip() and new_status == "pending":
                new_status = "in_transit"

            barcode = payload.barcode.strip() if payload.barcode and payload.barcode.strip(
            ) else (None if payload.barcode is not None else row["barcode"])
            attachment = payload.attachment.strip(
            ) if payload.attachment is not None else row["attachment"]
            unit = payload.unit.strip(
            ) if payload.unit is not None else row["unit"]
            comment = payload.comment.strip(
            ) if payload.comment is not None else row["comment"]
            url = payload.url.strip(
            ) if payload.url is not None else row["url"]

            conn.execute("""
                UPDATE tracks SET barcode=?, parcel_id=?, attachment=?, quantity=?, unit=?, price=?, weight_g=?, comment=?, url=?, status=? WHERE id=?
            """, (barcode, parcel_id, attachment, new_qty, unit,
                  payload.price if payload.price is not None else row["price"],
                  payload.weight_g if payload.weight_g is not None else row["weight_g"],
                  comment, url, new_status, track_id))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_update)


@app.delete("/api/tracks/{track_id}")
async def delete_track(track_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _delete():
        with get_conn() as conn:
            conn.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_delete)


# =====================================================================
#  СКАН / ВЫДАЧА / ВЕС / ПОЛУЧАТЕЛИ
# =====================================================================
@app.post("/api/scan")
async def scan(barcode: str, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _scan():
        with get_conn() as conn:
            row = conn.execute(
                "SELECT id FROM tracks WHERE barcode = ?", (barcode,)).fetchone()
            if not row:
                raise HTTPException(404, "Track not found")
            return {"id": row["id"]}
    return await run_in_threadpool(_scan)


@app.post("/api/tracks/{track_id}/issue")
async def issue_track(track_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _issue():
        with get_conn() as conn:
            conn.execute(
                "UPDATE tracks SET status = 'issued', issued_at = ? WHERE id = ?", (_now(), track_id))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_issue)


@app.post("/api/tracks/{track_id}/weigh")
async def weigh_track(track_id: int, payload: WeightUpdate, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _weigh():
        with get_conn() as conn:
            conn.execute("UPDATE tracks SET weight_g = ? WHERE id = ?",
                         (payload.weight_g, track_id))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_weigh)


@app.get("/api/recipients")
async def list_recipients(current_user: Annotated[dict, Depends(get_current_user)]):
    def _list():
        with get_conn() as conn:
            if current_user["is_admin"]:
                rows = conn.execute(
                    "SELECT id, name, username, is_admin FROM recipients WHERE is_deleted = 0 ORDER BY is_admin DESC, name").fetchall()
            else:
                rows = conn.execute(
                    "SELECT id, name, username, is_admin FROM recipients WHERE id = ? AND is_deleted = 0", (current_user["id"],)).fetchall()
            return [dict(r) for r in rows]
    return await run_in_threadpool(_list)


@app.post("/api/recipients")
async def create_recipient(payload: RecipientCreate, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _create():
        with get_conn() as conn:
            try:
                conn.execute("INSERT INTO recipients (name, username, password_hash) VALUES (?, ?, ?)",
                             (payload.name, payload.username, password_hash.hash(payload.password)))
                conn.commit()
            except sqlite3.IntegrityError:
                raise HTTPException(400, "Логин занят")
        return {"ok": True}
    return await run_in_threadpool(_create)


@app.delete("/api/recipients/{recipient_id}")
async def delete_recipient(recipient_id: int, current_user: Annotated[dict, Depends(get_super_admin)]):
    def _delete():
        with get_conn() as conn:
            conn.execute(
                "UPDATE recipients SET is_deleted = 1, username = NULL, password_hash = NULL WHERE id = ? AND is_admin = 0", (recipient_id,))
            conn.commit()
        return {"ok": True}
    return await run_in_threadpool(_delete)


@app.get("/api/my_stats")
async def my_stats(current_user: Annotated[dict, Depends(get_current_user)]):
    return await run_in_threadpool(_recipient_stats, current_user["id"])


@app.get("/api/recipients/{recipient_id}/stats")
async def admin_recipient_stats(recipient_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(_recipient_stats, recipient_id)


def _recipient_stats(recipient_id: int):
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
                    "price": row["price"],
                    "weight_g": row["weight_g"], "comment": row["comment"],
                    "url": row["url"], "status": row["status"], "issued_at": row["issued_at"],
                    "parcel_id": row["parcel_id"], "parcel_name": row["parcel_name"],
                    "total_qty": row["total_track_qty"],
                    "recipients": []
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


app.mount("/", StaticFiles(directory=settings.frontend_dir,
          html=True), name="static")
