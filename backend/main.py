from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from config import settings
from database import init_db
from auth import refresh_token_middleware

# Импорт роутеров
from routers import auth, recipients, parcels, tracks, orders


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Создаем папку для загрузок при старте, если её нет
    os.makedirs(settings.uploads_dir, exist_ok=True)
    init_db()
    yield

app = FastAPI(title="Трекер посылок", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url=None)

app.middleware("http")(refresh_token_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Refresh-Token"]
)

app.include_router(auth.router)
app.include_router(recipients.router)
app.include_router(parcels.router)
app.include_router(tracks.router)
app.include_router(orders.router)

app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
app.mount("/", StaticFiles(directory=settings.frontend_dir,
          html=True), name="static")
