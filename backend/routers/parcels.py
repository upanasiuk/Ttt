from fastapi import APIRouter, Depends, HTTPException
from starlette.concurrency import run_in_threadpool
from typing import Annotated

from models import ParcelCreate
from auth import get_admin_user, get_current_user
import crud.parcels as crud_parc
from database import get_conn
from services.export import generate_excel_response

router = APIRouter(prefix="/api/parcels", tags=["Parcels"])


@router.get("")
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
                    tracks_dict[tid]["recipients"].append(
                        {"id": row["recipient_id"], "name": row["recipient"], "quantity": row["rec_qty"]})

                if not current_user["is_admin"] and not tracks_dict:
                    continue

                result.append({
                    "id": p["id"], "name": p["name"], "is_active": bool(p["is_active"]), "status": p["status"],
                    "created_at": p["created_at"], "completed_at": p["completed_at"],
                    "tracks": list(tracks_dict.values()),
                })
            return result
    return await run_in_threadpool(_list)


@router.post("")
async def create_parcel(payload: ParcelCreate, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_parc.create_parcel, payload.name)


@router.post("/{parcel_id}/activate")
async def activate_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_parc.set_active_parcel, parcel_id)


@router.post("/{parcel_id}/complete")
async def complete_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_parc.update_parcel_status, parcel_id, "completed")


@router.post("/{parcel_id}/reopen")
async def reopen_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_parc.update_parcel_status, parcel_id, "active")


@router.delete("/{parcel_id}")
async def delete_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_parc.delete_parcel, parcel_id)


@router.get("/{parcel_id}/export")
async def export_parcel(parcel_id: int, current_user: Annotated[dict, Depends(get_admin_user)]):
    def _export():
        p = crud_parc.get_parcel_name(parcel_id)
        if not p:
            raise HTTPException(404, "Parcel not found")

        with get_conn() as conn:
            tracks = conn.execute(
                "SELECT t.attachment, t.quantity, t.unit, t.price FROM tracks t WHERE t.parcel_id = ? AND t.status = 'received_cargo'", (parcel_id,)).fetchall()
        return tracks, p["name"]

    tracks, p_name = await run_in_threadpool(_export)
    return await run_in_threadpool(generate_excel_response, tracks, p_name)
