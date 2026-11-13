from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Union


class Settings(BaseSettings):
    jwt_secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    db_path: str = "/data/db/parcels.db"
    uploads_dir: str = "/data/uploads"
    frontend_dir: str = "/app/frontend"

    cors_origins: Union[List[str], str] = ["*"]
    backend_url: str = "http://localhost:8000"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
