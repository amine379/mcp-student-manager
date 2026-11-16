from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    Attendance, ExamPrep, Homework, NotificationType, ParentNotification, Role, Student, User,
)
from app.schemas import (
    AbsenceNotification, ExamPrepNotification, HomeworkNotification, MarkNotificationSentIn, NotificationSummary,
)
from app.security import admin_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"], dependencies=[Depends(admin_user)])


async def _sent_keys(db: AsyncSession, type_: NotificationType) -> set[tuple[int, int]]:
    rows = (await db.scalars(
        select(ParentNotification).where(ParentNotification.type == type_)
    )).all()
    return {(r.reference_id, r.parent_id) for r in rows}


async def _parents_with_phone(db: AsyncSession) -> list[User]:
    return list((await db.scalars(
        select(User).where(User.role == Role.PARENT, User.phone.is_not(None))
        .options(selectinload(User.children))
    )).all())


@router.get("/summary", response_model=NotificationSummary)
async def summary(db: AsyncSession = Depends(get_db)):
    return NotificationSummary(
        absence=len(await _list_absence(db)),
        homework=len(await _list_homework(db)),
        exam_prep=len(await _list_exam_prep(db)),
    )


async def _list_absence(db: AsyncSession) -> list[AbsenceNotification]:
    sent = await _sent_keys(db, NotificationType.ABSENCE)
    rows = (await db.scalars(
        select(Attendance).where(Attendance.present.is_(False))
        .options(
            selectinload(Attendance.lesson),
            selectinload(Attendance.student).selectinload(Student.parent),
        )
    )).all()
    out = []
    for a in rows:
        parent = a.student.parent
        if parent is None or not parent.phone:
            continue
        if (a.id, parent.id) in sent:
            continue
        out.append(AbsenceNotification(
            reference_id=a.id, parent_id=parent.id, parent_name=parent.full_name, phone=parent.phone,
            student_name=f"{a.student.first_name} {a.student.last_name}",
            level=a.student.level, subject=a.lesson.subject, lesson_date=a.lesson.date,
        ))
    out.sort(key=lambda r: r.lesson_date, reverse=True)
    return out


async def _list_homework(db: AsyncSession) -> list[HomeworkNotification]:
    sent = await _sent_keys(db, NotificationType.HOMEWORK)
    homeworks = (await db.scalars(select(Homework))).all()
    parents = await _parents_with_phone(db)
    out = []
    for hw in homeworks:
        for p in parents:
            if (hw.id, p.id) in sent:
                continue
            if not any(c.level == hw.level for c in p.children):
                continue
            out.append(HomeworkNotification(
                reference_id=hw.id, parent_id=p.id, parent_name=p.full_name, phone=p.phone,
                level=hw.level, subject=hw.subject, title=hw.title, due_date=hw.due_date,
                correction_published=hw.correction_published_at is not None,
            ))
    out.sort(key=lambda r: r.due_date, reverse=True)
    return out


async def _list_exam_prep(db: AsyncSession) -> list[ExamPrepNotification]:
    sent = await _sent_keys(db, NotificationType.EXAM_PREP)
    items = (await db.scalars(select(ExamPrep))).all()
    parents = await _parents_with_phone(db)
    out = []
    for ep in items:
        for p in parents:
            if (ep.id, p.id) in sent:
                continue
            if not any(c.level == ep.level for c in p.children):
                continue
            out.append(ExamPrepNotification(
                reference_id=ep.id, parent_id=p.id, parent_name=p.full_name, phone=p.phone,
                level=ep.level, subject=ep.subject, semester=ep.semester, control_number=ep.control_number,
                title=ep.title,
            ))
    out.sort(key=lambda r: r.reference_id, reverse=True)
    return out


@router.get("/absence", response_model=list[AbsenceNotification])
async def list_absence(db: AsyncSession = Depends(get_db)):
    return await _list_absence(db)


@router.get("/homework", response_model=list[HomeworkNotification])
async def list_homework(db: AsyncSession = Depends(get_db)):
    return await _list_homework(db)


@router.get("/exam-prep", response_model=list[ExamPrepNotification])
async def list_exam_prep(db: AsyncSession = Depends(get_db)):
    return await _list_exam_prep(db)


@router.post("/mark-sent", status_code=204)
async def mark_sent(data: MarkNotificationSentIn, db: AsyncSession = Depends(get_db)):
    exists = await db.scalar(select(ParentNotification).where(
        ParentNotification.type == data.type,
        ParentNotification.reference_id == data.reference_id,
        ParentNotification.parent_id == data.parent_id,
    ))
    if exists is not None:
        return
    parent = await db.get(User, data.parent_id)
    if parent is None or parent.role != Role.PARENT:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "parent_not_found")
    db.add(ParentNotification(type=data.type, reference_id=data.reference_id, parent_id=data.parent_id))
    await db.commit()


_LIST_FN = {
    NotificationType.ABSENCE: _list_absence,
    NotificationType.HOMEWORK: _list_homework,
    NotificationType.EXAM_PREP: _list_exam_prep,
}


@router.post("/{type}/clear-all", status_code=204)
async def clear_all(type: NotificationType, db: AsyncSession = Depends(get_db)):
    """Marque tous les messages en attente de ce type comme traités, sans ouvrir WhatsApp."""
    pending = await _LIST_FN[type](db)
    for row in pending:
        db.add(ParentNotification(type=type, reference_id=row.reference_id, parent_id=row.parent_id))
    await db.commit()
