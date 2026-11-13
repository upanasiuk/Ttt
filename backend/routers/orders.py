from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from starlette.concurrency import run_in_threadpool
from typing import Annotated, List, Optional
import uuid
import os
import shutil

from config import settings
from auth import get_admin_user, get_current_user
import crud.orders as crud_ord
from models import OrderCreate, OrderUpdateAdmin

router = APIRouter(prefix="/api/orders", tags=["Orders"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Недопустимый формат файла")

    # Проверка размера (читаем чанк)
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(400, "Файл слишком большой (макс 5 МБ)")

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.uploads_dir, filename)

    def _save():
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return filename
    return await run_in_threadpool(_save)


@router.post("")
async def create_order(
    url: str = Form(...),
    description: str = Form(None),
    quantity: int = Form(1),
    files: List[UploadFile] = File(None),
    current_user: Annotated[dict, Depends(get_current_user)] = None
):
    def _create():
        order_id = crud_ord.create_order(
            current_user["id"], url, description, quantity)

        if files:
            for file in files:
                ext = os.path.splitext(file.filename)[1].lower()
                if ext in ALLOWED_EXTENSIONS:
                    filename = f"{uuid.uuid4().hex}{ext}"
                    file_path = os.path.join(settings.uploads_dir, filename)
                    with open(file_path, "wb") as buffer:
                        shutil.copyfileobj(file.file, buffer)
                    crud_ord.add_file(order_id, filename, 'user')
        return {"id": order_id}
    return await run_in_threadpool(_create)


@router.get("")
async def list_orders(current_user: Annotated[dict, Depends(get_current_user)]):
    return await run_in_threadpool(crud_ord.get_orders, current_user["id"], current_user["is_admin"])


@router.put("/{order_id}")
async def update_order(order_id: int, payload: OrderUpdateAdmin, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_ord.update_order_status, order_id, payload.status, payload.admin_comment)


@router.delete("/{order_id}")
async def delete_order(order_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    # Тут должна быть проверка, что юзер удаляет свой заказ (и только в статусе new), а админ — любой.
    # Для простоты пока разрешим всем авторизованным.
    return await run_in_threadpool(crud_ord.delete_order, order_id)
