from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from starlette.concurrency import run_in_threadpool
from typing import Annotated, List, Optional
from PIL import Image
import uuid
import os
import shutil
import io

from config import settings
from auth import get_admin_user, get_current_user
import crud.orders as crud_ord
from models import OrderUpdateAdmin

router = APIRouter(prefix="/api/orders", tags=["Orders"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024


def _process_and_save_file(file: UploadFile) -> str:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Недопустимый формат файла")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(400, "Файл слишком большой (макс 5 МБ)")

    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.uploads_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Генерация превью (уменьшаем до 300px по большей стороне)
    thumb_name = f"thumb_{filename}"
    thumb_path = os.path.join(settings.uploads_dir, thumb_name)
    try:
        with Image.open(file_path) as img:
            img.thumbnail((300, 300))
            img.save(thumb_path)
    except Exception:
        # Если Pillow не смог (например, битый файл), просто копируем оригинал
        shutil.copy2(file_path, thumb_path)

    return filename


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    filename = await run_in_threadpool(_process_and_save_file, file)
    return {"filename": filename}


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
                if file.filename:
                    filename = _process_and_save_file(file)
                    crud_ord.add_file(order_id, filename, 'user')
        return {"id": order_id}
    return await run_in_threadpool(_create)


@router.get("")
async def list_orders(current_user: Annotated[dict, Depends(get_current_user)]):
    return await run_in_threadpool(crud_ord.get_orders, current_user["id"], current_user["is_admin"])


@router.put("/{order_id}")
async def update_order(order_id: int, payload: OrderUpdateAdmin, current_user: Annotated[dict, Depends(get_admin_user)]):
    return await run_in_threadpool(crud_ord.update_order_status, order_id, payload.status, payload.admin_comment)


@router.put("/{order_id}/edit")
async def edit_order(
    order_id: int,
    url: str = Form(...),
    description: str = Form(None),
    quantity: int = Form(1),
    files: List[UploadFile] = File(None),
    current_user: Annotated[dict, Depends(get_current_user)] = None
):
    def _edit():
        order = crud_ord.get_order_by_id(order_id)
        if not order:
            raise HTTPException(404, "Заказ не найден")
        if order["user_id"] != current_user["id"]:
            raise HTTPException(403, "Нет доступа")
        if order["status"] != "new":
            raise HTTPException(400, "Редактировать можно только новые заказы")

        crud_ord.update_order_user(order_id, url, description, quantity)

        if files:
            for file in files:
                if file.filename:
                    filename = _process_and_save_file(file)
                    crud_ord.add_file(order_id, filename, 'user')
        return {"ok": True}
    return await run_in_threadpool(_edit)


@router.delete("/{order_id}")
async def delete_order(order_id: int, current_user: Annotated[dict, Depends(get_current_user)]):
    def _delete():
        order = crud_ord.get_order_by_id(order_id)
        if not order:
            raise HTTPException(404, "Заказ не найден")

        if not current_user["is_admin"]:
            if order["user_id"] != current_user["id"]:
                raise HTTPException(403, "Нет доступа")
            if order["status"] != "new":
                raise HTTPException(
                    400, "Удалять можно только новые заказы (пока админ не перешел по ссылке)")

        crud_ord.delete_order(order_id)
        return {"ok": True}
    return await run_in_threadpool(_delete)
