from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Level, Role, ScheduleSlot, User
from app.schemas import ScheduleSlotIn, ScheduleSlotOut
from app.security import admin_user, current_user, my_students

router = APIRouter(prefix="/api/schedule", tags=["emploi du temps"])

# Emploi du temps initial, créé au premier démarrage (0 = lundi)
DEFAULT_SCHEDULE = [
    (0, "19:00", "20:30", Level.AC1), (0, "20:30", "22:00", Level.AC3),
    (1, "19:00", "20:30", Level.AC2), (1, "20:30", "22:00", Level.AC3),
    (2, "19:00", "20:30", Level.AC1), (2, "20:30", "22:00", Level.AC3),
    (3, "19:00", "20:30", Level.AC2), (3, "20:30", "22:00", Level.AC3),
    (4, "19:00", "20:30", Level.AC1), (4, "20:30", "22:00", Level.AC2),
]


async def seed_schedule(db: AsyncSession) -> None:
    if await db.scalar(select(ScheduleSlot.id).limit(1)):
        return
    db.add_all(ScheduleSlot(weekday=d, start=s, end=e, level=lv) for d, s, e, lv in DEFAULT_SCHEDULE)
    await db.commit()


async def load_schedule(db: AsyncSession, levels: set[Level] | None = None) -> list[ScheduleSlot]:
    q = select(ScheduleSlot).order_by(ScheduleSlot.weekday, ScheduleSlot.start)
    if levels is not None:
        q = q.where(ScheduleSlot.level.in_(levels))
    return list((await db.scalars(q)).all())


@router.get("", response_model=list[ScheduleSlotOut])
async def get_schedule(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if user.role == Role.ADMIN:
        return await load_schedule(db)
    return await load_schedule(db, {s.level for s in await my_students(user, db)})


@router.put("", response_model=list[ScheduleSlotOut], dependencies=[Depends(admin_user)])
async def replace_schedule(items: list[ScheduleSlotIn], db: AsyncSession = Depends(get_db)):
    for it in items:
        if it.start >= it.end:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid_time_range")
    await db.execute(delete(ScheduleSlot))
    db.add_all(ScheduleSlot(**it.model_dump()) for it in items)
    await db.commit()
    return await load_schedule(db)
