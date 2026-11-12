from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db
from auth import refresh_token_middleware

# Импорт роутеров
from routers import auth, recipients, parcels, tracks


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(title="Трекер посылок", lifespan=lifespan,
              docs_url=None, redoc_url=None, openapi_url=None)

# Middleware
app.middleware("http")(refresh_token_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Refresh-Token"]
)

# Подключение роутеров
app.include_router(auth.router)
app.include_router(recipients.router)
app.include_router(parcels.router)
app.include_router(tracks.router)

# Монтирование статики (фронтенд)
app.mount("/", StaticFiles(directory=settings.frontend_dir,
          html=True), name="static")
