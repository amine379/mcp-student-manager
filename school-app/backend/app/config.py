from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://schoolapp:schoolapp_secret@localhost:5432/schoolapp"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24 * 30
    upload_dir: str = "./uploads"
    max_upload_mb: int = 8
    max_files_per_submission: int = 6
    admin_username: str = "prof"
    admin_password: str = "prof1234"
    cors_origins: str = "http://localhost:3000"


settings = Settings()
