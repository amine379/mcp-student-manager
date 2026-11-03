from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Attendance, ContentType, Document, Lesson, Level, Role, Student, User
from app.schemas import AbsenceOut, AttendanceItem, AttendanceRow, DocumentOut, LessonIn, LessonOut
from app.security import admin_user, current_user, get_accessible_student, my_students
from app.storage import delete_upload, save_upload

router = APIRouter(prefix="/api", tags=["séances"])

# Emploi du temps fixe (0 = lundi)
SCHEDULE = {
    0: {"19:00-20:30": "1AC", "20:30-22:00": "3AC"},
    1: {"19:00-20:30": "2AC", "20:30-22:00": "3AC"},
    2: {"19:00-20:30": "1AC", "20:30-22:00": "3AC"},
    3: {"19:00-20:30": "2AC", "20:30-22:00": "3AC"},
    4: {"19:00-20:30": "1AC", "20:30-22:00": "2AC"},
}


@router.get("/schedule")
async def schedule():
    return SCHEDULE


async def _get_lesson(db: AsyncSession, lesson_id: int, user: User) -> Lesson:
    lesson = await db.scalar(
        select(Lesson).where(Lesson.id == lesson_id).options(selectinload(Lesson.documents))
    )
    if lesson is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "lesson_not_found")
    if user.role != Role.ADMIN:
        levels = {s.level for s in await my_students(user, db)}
        if lesson.level not in levels:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "lesson_not_found")
    return lesson


@router.get("/lessons", response_model=list[LessonOut])
async def list_lessons(
    level: Level | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Lesson).options(selectinload(Lesson.documents)).order_by(Lesson.date.desc(), Lesson.slot)
    if user.role != Role.ADMIN:
        levels = {s.level for s in await my_students(user, db)}
        if level and level not in levels:
            return []
        q = q.where(Lesson.level.in_([level] if level else levels))
    elif level:
        q = q.where(Lesson.level == level)
    if date_from:
        q = q.where(Lesson.date >= date_from)
    if date_to:
        q = q.where(Lesson.date <= date_to)
    return (await db.scalars(q)).all()


@router.post("/lessons", response_model=LessonOut, status_code=201, dependencies=[Depends(admin_user)])
async def create_lesson(data: LessonIn, db: AsyncSession = Depends(get_db)):
    lesson = Lesson(**data.model_dump())
    db.add(lesson)
    try:
        await db.commit()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "lesson_already_exists")
    await db.refresh(lesson, ["documents"])
    return lesson


@router.get("/lessons/{lesson_id}", response_model=LessonOut)
async def get_lesson(lesson_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await _get_lesson(db, lesson_id, user)


@router.put("/lessons/{lesson_id}", response_model=LessonOut)
async def update_lesson(
    lesson_id: int, data: LessonIn, user: User = Depends(admin_user), db: AsyncSession = Depends(get_db)
):
    lesson = await _get_lesson(db, lesson_id, user)
    for key, value in data.model_dump().items():
        setattr(lesson, key, value)
    try:
        await db.commit()
    except IntegrityError:
        raise HTTPException(status.HTTP_409_CONFLICT, "lesson_already_exists")
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=204)
async def delete_lesson(lesson_id: int, user: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    lesson = await _get_lesson(db, lesson_id, user)
    for doc in lesson.documents:
        delete_upload(doc.file_path)
    await db.delete(lesson)
    await db.commit()


# ---------- Documents (cours / exercices / corrections) ----------
@router.post("/lessons/{lesson_id}/documents", response_model=DocumentOut, status_code=201)
async def add_document(
    lesson_id: int,
    type: ContentType = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_lesson(db, lesson_id, user)
    doc = Document(lesson_id=lesson_id, type=type, title=title, file_path=await save_upload(file, "documents"))
    db.add(doc)
    await db.commit()
    return doc


@router.delete("/documents/{doc_id}", status_code=204, dependencies=[Depends(admin_user)])
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    doc = await db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document_not_found")
    delete_upload(doc.file_path)
    await db.delete(doc)
    await db.commit()


# ---------- Absences ----------
@router.get("/lessons/{lesson_id}/attendance", response_model=list[AttendanceRow])
async def get_attendance(lesson_id: int, user: User = Depends(admin_user), db: AsyncSession = Depends(get_db)):
    lesson = await _get_lesson(db, lesson_id, user)
    students = (await db.scalars(
        select(Student).where(Student.level == lesson.level, Student.is_active.is_(True))
        .order_by(Student.first_name)
    )).all()
    marks = {a.student_id: a.present for a in (await db.scalars(
        select(Attendance).where(Attendance.lesson_id == lesson_id)
    )).all()}
    return [
        AttendanceRow(student_id=s.id, first_name=s.first_name, last_name=s.last_name, present=marks.get(s.id))
        for s in students
    ]


@router.put("/lessons/{lesson_id}/attendance", status_code=204)
async def set_attendance(
    lesson_id: int, items: list[AttendanceItem], user: User = Depends(admin_user), db: AsyncSession = Depends(get_db)
):
    lesson = await _get_lesson(db, lesson_id, user)
    valid_ids = set((await db.scalars(select(Student.id).where(Student.level == lesson.level))).all())
    existing = {a.student_id: a for a in (await db.scalars(
        select(Attendance).where(Attendance.lesson_id == lesson_id)
    )).all()}
    for item in items:
        if item.student_id not in valid_ids:
            continue
        if item.student_id in existing:
            existing[item.student_id].present = item.present
        else:
            db.add(Attendance(lesson_id=lesson_id, student_id=item.student_id, present=item.present))
    await db.commit()


@router.get("/students/{student_id}/absences", response_model=list[AbsenceOut])
async def student_absences(student_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await get_accessible_student(student_id, user, db)
    rows = (await db.scalars(
        select(Lesson).join(Attendance)
        .where(Attendance.student_id == student_id, Attendance.present.is_(False))
        .order_by(Lesson.date.desc())
    )).all()
    return [
        AbsenceOut(lesson_id=l.id, date=l.date, slot=l.slot, subject=l.subject, title=l.title) for l in rows
    ]
