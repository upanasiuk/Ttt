from fastapi import APIRouter, HTTPException, Depends
from starlette.concurrency import run_in_threadpool
from typing import Annotated

from models import PasswordChangeAdmin, RecipientCreate
from auth import get_super_admin, get_current_user, get_password_hash
import crud.recipients as crud_rec
from services.stats import get_recipient_stats

router = APIRouter(prefix="/api/recipients", tags=["Recipients"])


@router.get("")
async def list_recipients(current_user: Annotated[dict, Depends(get_current_user)]):
    return await run_in_threadpool(crud_rec.list_recipients, current_user["is_admin"], current_user["id"])

# Создавать пользователей может ТОЛЬКО Главный админ


@router.post("")
async def create_recipient(payload: RecipientCreate, current_user: Annotated[dict, Depends(get_super_admin)]):
    def _create():
        try:
            crud_rec.create_user(payload.name, payload.username,
                                 get_password_hash(payload.password))
        except Exception:
            raise HTTPException(400, "Логин занят")
        return {"ok": True}
    return await run_in_threadpool(_create)


@router.delete("/{recipient_id}")
async def delete_recipient(recipient_id: int, current_user: Annotated[dict, Depends(get_super_admin)]):
    return await run_in_threadpool(crud_rec.soft_delete_user, recipient_id)

# Выдавать админку может ТОЛЬКО Главный админ


@router.post("/{recipient_id}/promote")
async def promote_recipient(recipient_id: int, current_user: Annotated[dict, Depends(get_super_admin)]):
    def _promote():
        user = crud_rec.get_user_by_id(recipient_id)
        if not user:
            raise HTTPException(404, "Пользователь не найден")
        if user["is_admin"]:
            raise HTTPException(400, "Уже администратор")
        crud_rec.set_admin_status(recipient_id, 1)
        return {"ok": True}
    return await run_in_threadpool(_promote)

# Забирать админку может ТОЛЬКО Главный админ


@router.post("/{recipient_id}/demote")
async def demote_recipient(recipient_id: int, current_user: Annotated[dict, Depends(get_super_admin)]):
    def _demote():
        if recipient_id == current_user["id"]:
            raise HTTPException(400, "Нельзя отозвать права у себя")
        user = crud_rec.get_user_by_id(recipient_id)
        if not user:
            raise HTTPException(404, "Пользователь не найден")
        if not user["is_admin"]:
            raise HTTPException(400, "Не является администратором")
        crud_rec.set_admin_status(recipient_id, 0)
        return {"ok": True}
    return await run_in_threadpool(_demote)


@router.post("/{recipient_id}/password")
async def admin_change_password(recipient_id: int, payload: PasswordChangeAdmin, current_user: Annotated[dict, Depends(get_super_admin)]):
    return await run_in_threadpool(crud_rec.update_password, recipient_id, get_password_hash(payload.new_password))


@router.get("/{recipient_id}/stats")
async def admin_recipient_stats(recipient_id: int, current_user: Annotated[dict, Depends(get_super_admin)]):
    return await run_in_threadpool(get_recipient_stats, recipient_id)
