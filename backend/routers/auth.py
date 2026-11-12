from fastapi import APIRouter, HTTPException, Depends
from starlette.concurrency import run_in_threadpool
from typing import Annotated

from models import LoginData, SetupAdmin, PasswordChangeSelf
from auth import get_current_user, verify_password, get_password_hash, create_access_token
from config import settings
import crud.recipients as crud_rec

router = APIRouter(prefix="/api", tags=["Auth"])


@router.get("/config")
async def get_config(): return {"backend_url": settings.backend_url}


@router.get("/check_setup")
def check_setup():
    with crud_rec.get_conn() as conn:
        return {"is_setup": conn.execute("SELECT COUNT(*) FROM recipients").fetchone()[0] > 0}


@router.post("/setup")
async def setup_admin(payload: SetupAdmin):
    def _setup():
        if crud_rec.get_user_by_username(payload.username):
            raise HTTPException(400, "Система уже настроена")
        crud_rec.create_user(payload.name, payload.username,
                             get_password_hash(payload.password), is_admin=1)
        return {"ok": True}
    return await run_in_threadpool(_setup)


@router.post("/login")
async def login(payload: LoginData):
    def _login():
        user = crud_rec.get_user_by_username(payload.username)
        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(400, "Неверный логин или пароль")

        token = create_access_token(user["id"])
        return {"access_token": token, "user": {"id": user["id"], "name": user["name"], "is_admin": bool(user["is_admin"])}}
    return await run_in_threadpool(_login)


@router.get("/me")
async def read_users_me(current_user: Annotated[dict, Depends(get_current_user)]):
    return {"id": current_user["id"], "name": current_user["name"], "is_admin": bool(current_user["is_admin"])}


@router.post("/change_password")
async def change_password(payload: PasswordChangeSelf, current_user: Annotated[dict, Depends(get_current_user)]):
    def _change():
        if not verify_password(payload.old_password, current_user["password_hash"]):
            raise HTTPException(400, "Старый пароль неверен")
        crud_rec.update_password(
            current_user["id"], get_password_hash(payload.new_password))
        return {"ok": True}
    return await run_in_threadpool(_change)
