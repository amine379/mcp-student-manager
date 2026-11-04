from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    Attendance, Feedback, Homework, Lesson, Role, SchoolExam, Student, Submission, SubmissionStatus, User,
)
from app.routers.schedule import load_schedule
from app.security import current_user, my_students

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
async def dashboard(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()
    if user.role == Role.ADMIN:
        return await _admin(db, today)
    return await _family(user, db, today)


async def _admin(db: AsyncSession, today: date) -> dict:
    per_level = dict((await db.execute(
        select(Student.level, func.count()).where(Student.is_active.is_(True)).group_by(Student.level)
    )).all())

    exams = (await db.scalars(
        select(SchoolExam).options(selectinload(SchoolExam.student))
        .where(SchoolExam.exam_date.between(today, today + timedelta(days=14)))
        .order_by(SchoolExam.exam_date)
    )).all()

    open_homeworks = (await db.scalars(
        select(Homework).where(Homework.correction_published_at.is_(None)).order_by(Homework.due_date)
    )).all()
    submitted = dict((await db.execute(
        select(Submission.homework_id, func.count())
        .where(Submission.status == SubmissionStatus.SUBMITTED)
        .group_by(Submission.homework_id)
    )).all())

    return {
        "role": "admin",
        "students_per_level": {lvl.value: n for lvl, n in per_level.items()},
        "today_schedule": [
            {"start": s.start, "end": s.end, "level": s.level.value, "subject": s.subject.value if s.subject else None}
            for s in await load_schedule(db) if s.weekday == today.weekday()
        ],
        "upcoming_exams": [
            {
                "id": e.id, "date": e.exam_date, "subject": e.subject.value,
                "student": f"{e.student.first_name} {e.student.last_name}", "level": e.student.level.value,
            }
            for e in exams
        ],
        "open_homeworks": [
            {
                "id": h.id, "title": h.title, "level": h.level.value, "due_date": h.due_date,
                "submitted": submitted.get(h.id, 0), "total": per_level.get(h.level, 0),
            }
            for h in open_homeworks
        ],
        "unread_feedback": await db.scalar(select(func.count()).where(Feedback.is_read.is_(False))),
    }


async def _family(user: User, db: AsyncSession, today: date) -> dict:
    children = []
    for s in await my_students(user, db):
        absences = await db.scalar(
            select(func.count()).select_from(Attendance)
            .where(Attendance.student_id == s.id, Attendance.present.is_(False))
        )
        done_ids = set((await db.scalars(
            select(Submission.homework_id).where(
                Submission.student_id == s.id, Submission.status == SubmissionStatus.SUBMITTED
            )
        )).all())
        todo = (await db.scalars(
            select(Homework).where(Homework.level == s.level, Homework.correction_published_at.is_(None))
            .order_by(Homework.due_date)
        )).all()
        exams = (await db.scalars(
            select(SchoolExam).where(SchoolExam.student_id == s.id, SchoolExam.exam_date >= today)
            .order_by(SchoolExam.exam_date)
        )).all()
        last_lesson = await db.scalar(
            select(Lesson).where(Lesson.level == s.level).order_by(Lesson.date.desc()).limit(1)
        )
        children.append({
            "id": s.id,
            "name": f"{s.first_name} {s.last_name}",
            "level": s.level.value,
            "absences": absences,
            "homeworks_todo": [
                {"id": h.id, "title": h.title, "subject": h.subject.value, "due_date": h.due_date}
                for h in todo if h.id not in done_ids
            ],
            "upcoming_exams": [
                {"id": e.id, "subject": e.subject.value, "date": e.exam_date} for e in exams
            ],
            "last_lesson": (
                {"id": last_lesson.id, "title": last_lesson.title, "date": last_lesson.date}
                if last_lesson else None
            ),
        })
    return {"role": user.role.value, "children": children}
