from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from config import settings
from database import get_conn

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)


def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password):
    return password_hash.hash(password)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + \
        timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.jwt_secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key,
                             algorithms=[settings.algorithm])
        return payload
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(token: Annotated[str | None, Depends(oauth2_scheme)]):
    if not token:
        raise HTTPException(status_code=401, detail="No token")

    payload = decode_token(token)
    user_id: str = payload.get("sub")

    with get_conn() as conn:
        user = conn.execute(
            "SELECT * FROM recipients WHERE id = ? AND is_deleted = 0", (
                user_id,)
        ).fetchone()
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

# Middleware для авто-продления токена


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
                        new_token = create_access_token(int(user_id))
                        response.headers["X-Refresh-Token"] = new_token
        except InvalidTokenError:
            pass

    return response
