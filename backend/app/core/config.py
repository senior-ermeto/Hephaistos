from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Héphaïstos - Senior Aerospace Ermeto"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    DATABASE_URL: str = "sqlite:///./hephaistos_local.db"
    SECRET_KEY: str = "super_secret_jwt_key_hephaistos_ermeto_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24h

    FIRST_ADMIN_USERNAME: str = "admin"
    FIRST_ADMIN_PASSWORD: str = "admin123"
    FIRST_ADMIN_FIRSTNAME: str = "Administrateur"
    FIRST_ADMIN_LASTNAME: str = "Ermeto"
    SEED_DEMO_DATA: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
