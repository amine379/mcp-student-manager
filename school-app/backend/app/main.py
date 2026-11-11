from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Role, User
from app.routers import (
    accounts, auth, dashboard, exams, family_documents, homeworks, lessons, messages, schedule,
)
from app.security import hash_password


async def _init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        if not await db.scalar(select(User.id).where(User.role == Role.ADMIN)):
            db.add(User(
                username=settings.admin_username.lower(),
                password_hash=hash_password(settings.admin_password),
                role=Role.ADMIN,
                full_name="Professeur",
            ))
            await db.commit()
        await schedule.seed_schedule(db)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    await _init_db()
    yield


app = FastAPI(title="Amine Cours API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth, accounts, lessons, homeworks, exams, dashboard, schedule, family_documents, messages):
    app.include_router(r.router)

Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
