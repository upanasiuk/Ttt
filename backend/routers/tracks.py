from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool
from typing import Annotated, Optional

from models import TrackUpsert, TrackUpdate, WeightUpdate
from auth import get_admin_user, get_current_user
import crud.tracks as crud_tr
import crud.parcels as crud_parc
from database import get_conn
from services.stats import get_recipient_stats

router = APIRouter(prefix="/api", tags=["Tracks"])


@router.get("/tracks")
async def list_tracks(parcel_id: Optional[int] = None, status: Optional[str] = None, current_user: Annotated[dict, Depends(get_current_user)] = None):
    def _list():
        with get_conn() as conn:
            query = """
                SELECT t.id, t.barcode, t.status, t.attachment, t.quantity, t.unit, t.price, t.weight_g, t.comment, t.url, t.issued_at,
                       t.parcel_id, p.name AS parcel_name,
                       ta.recipient_id, r.name AS recipient, ta.quantity AS rec_qty, r.is_deleted AS recipient_deleted
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
                        "id": tid, "barcode": row["barcode"], "status": row["status"], "attachment": row["attachment"],
                        "quantity": row["quantity"], "unit": row["unit"], "price": row["price"], "weight_g": row["weight_g"],
                        "comment": row["comment"], "url": row["url"], "issued_at": row["issued_at"],
                        "parcel_id": row["parcel_id"], "parcel_name": row["parcel_name"], "recipients": []
                    }
                tracks_dict[tid]["recipients"].append({
                    "id": row["recipient_id"],
                    "name": row["recipient"],
                    "quantity": row["rec_qty"],
                    "is_deleted": bool(row["recipient_deleted"])
                })
            return list(tracks_dict.values())
    return await run_in_threadpool(_list)


@router.post("/tracks")
async def upsert_track(payload: TrackUpsert, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _upsert():
        parcel = crud_parc.get_active_parcel()
        parcel_id = payload.parcel_id or parcel["id"]
        total_qty = sum(a.quantity for a in payload.allocations)
        barcode = payload.barcode.strip() if payload.barcode and payload.barcode.strip() else None

        try:
            crud_tr.upsert_track(barcode, parcel_id, payload.attachment, total_qty, payload.unit,
                                 payload.price, payload.weight_g, payload.comment, payload.url, payload.allocations)
        except ValueError as e:
            raise HTTPException(400, str(e))

        return {"ok": True}
    return await run_in_threadpool(_upsert)


@router.put("/tracks/{track_id}")
async def update_track(track_id: int, payload: TrackUpdate, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _update():
        with get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
            if not row:
                raise HTTPException(404, "Track not found")

            new_qty = sum(
                a.quantity for a in payload.allocations) if payload.allocations is not None else row["quantity"]
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

            try:
                crud_tr.update_track(track_id, payload, payload.allocations,
                                     new_qty, barcode, attachment, unit, comment, url, new_status)
            except ValueError as e:
                raise HTTPException(400, str(e))

            return {"ok": True}
    return await run_in_threadpool(_update)


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_tr.delete_track, track_id)


@router.post("/scan")
async def scan(barcode: str, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _scan():
        with get_conn() as conn:
            row = conn.execute(
                "SELECT id FROM tracks WHERE barcode = ?", (barcode,)).fetchone()
            if not row:
                raise HTTPException(404, "Track not found")
            return {"id": row["id"]}
    return await run_in_threadpool(_scan)


@router.post("/tracks/{track_id}/issue")
async def issue_track(track_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_tr.issue_track, track_id)


@router.post("/tracks/{track_id}/weigh")
async def weigh_track(track_id: int, payload: WeightUpdate, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_tr.update_weight, track_id, payload.weight_g)


@router.get("/my_stats")
async def my_stats(current_user: Annotated[dict, Depends(get_current_user)]):
    return await run_in_threadpool(get_recipient_stats, current_user["id"])
