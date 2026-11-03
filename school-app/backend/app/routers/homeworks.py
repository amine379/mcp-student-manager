from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Homework, Level, Role, Student, Subject, Submission, SubmissionStatus, User
from app.schemas import (
    HomeworkForFamily, HomeworkOut, SubmissionOut, SubmissionRow, SubmissionStatusIn,
)
from app.security import admin_user, current_user, get_accessible_student, my_students
from app.storage import delete_upload, save_upload

router = APIRouter(prefix="/api/homeworks", tags=["devoirs"])


async def _get(db: AsyncSession, homework_id: int) -> Homework:
    hw = await db.get(Homework, homework_id)
    if hw is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "homework_not_found")
    return hw


@router.get("", response_model=list[HomeworkForFamily])
async def list_homeworks(
    level: Level | None = None, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    q = select(Homework).order_by(Homework.due_date.desc())
    if user.role == Role.ADMIN:
        if level:
            q = q.where(Homework.level == level)
        return [HomeworkForFamily.model_validate(h) for h in (await db.scalars(q)).all()]

    students = await my_students(user, db)
    levels = {s.level for s in students}
    homeworks = (await db.scalars(q.where(Homework.level.in_(levels)))).all()
    subs = (await db.scalars(
        select(Submission).where(Submission.student_id.in_([s.id for s in students]))
    )).all()
    by_key = {(s.homework_id, s.student_id): s for s in subs}

    result = []
    for hw in homeworks:
        item = HomeworkForFamily.model_validate(hw)
        item.my_submissions = {
            s.id: (SubmissionOut.model_validate(by_key[(hw.id, s.id)]) if (hw.id, s.id) in by_key else None)
            for s in students if s.level == hw.level
        }
        result.append(item)
    return result


@router.post("", response_model=HomeworkOut, status_code=201, dependencies=[Depends(admin_user)])
async def create_homework(
    level: Level = Form(...),
    subject: Subject = Form(...),
    title: str = Form(...),
    due_date: date = Form(...),
    description: str | None = Form(None),
    statement: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
):
    hw = Homework(level=level, subject=subject, title=title, due_date=due_date, description=description)
    if statement and statement.filename:
        hw.statement_path = await save_upload(statement, "homeworks")
    db.add(hw)
    await db.commit()
    return hw


@router.get("/{homework_id}", response_model=HomeworkOut, dependencies=[Depends(admin_user)])
async def get_homework(homework_id: int, db: AsyncSession = Depends(get_db)):
    return await _get(db, homework_id)


@router.delete("/{homework_id}", status_code=204, dependencies=[Depends(admin_user)])
async def delete_homework(homework_id: int, db: AsyncSession = Depends(get_db)):
    hw = await _get(db, homework_id)
    subs = (await db.scalars(select(Submission).where(Submission.homework_id == homework_id))).all()
    for path in [hw.statement_path, hw.correction_path, *[f for s in subs for f in s.files]]:
        delete_upload(path)
    await db.delete(hw)
    await db.commit()


# ---------- Côté parent / élève : envoyer les photos ----------
@router.post("/{homework_id}/submit", response_model=SubmissionOut)
async def submit_homework(
    homework_id: int,
    student_id: int = Form(...),
    files: list[UploadFile] = File(...),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    hw = await _get(db, homework_id)
    student = await get_accessible_student(student_id, user, db)
    if student.level != hw.level:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "wrong_level")
    if hw.correction_published_at is not None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "homework_closed")

    sub = await db.scalar(select(Submission).where(
        Submission.homework_id == homework_id, Submission.student_id == student_id
    ))
    existing = sub.files if sub else []
    if len(existing) + len(files) > settings.max_files_per_submission:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "too_many_files")

    saved = [await save_upload(f, "submissions") for f in files]
    if sub is None:
        sub = Submission(homework_id=homework_id, student_id=student_id, files=[])
        db.add(sub)
    sub.files = [*existing, *saved]
    sub.status = SubmissionStatus.SUBMITTED
    sub.submitted_at = datetime.now(timezone.utc)
    await db.commit()
    return sub


# ---------- Côté prof : suivi ----------
@router.get("/{homework_id}/submissions", response_model=list[SubmissionRow], dependencies=[Depends(admin_user)])
async def list_submissions(homework_id: int, db: AsyncSession = Depends(get_db)):
    hw = await _get(db, homework_id)
    students = (await db.scalars(
        select(Student).where(Student.level == hw.level, Student.is_active.is_(True)).order_by(Student.first_name)
    )).all()
    subs = {s.student_id: s for s in (await db.scalars(
        select(Submission).where(Submission.homework_id == homework_id)
    )).all()}
    return [
        SubmissionRow(
            student_id=s.id, first_name=s.first_name, last_name=s.last_name,
            status=subs[s.id].status if s.id in subs else SubmissionStatus.PENDING,
            files=subs[s.id].files if s.id in subs else [],
            submitted_at=subs[s.id].submitted_at if s.id in subs else None,
        )
        for s in students
    ]


@router.put("/{homework_id}/submissions/{student_id}", status_code=204, dependencies=[Depends(admin_user)])
async def set_submission_status(
    homework_id: int, student_id: int, data: SubmissionStatusIn, db: AsyncSession = Depends(get_db)
):
    await _get(db, homework_id)
    sub = await db.scalar(select(Submission).where(
        Submission.homework_id == homework_id, Submission.student_id == student_id
    ))
    if sub is None:
        sub = Submission(homework_id=homework_id, student_id=student_id, files=[])
        db.add(sub)
    sub.status = data.status
    await db.commit()


@router.post("/{homework_id}/close", status_code=204, dependencies=[Depends(admin_user)])
async def mark_missing_as_not_done(homework_id: int, db: AsyncSession = Depends(get_db)):
    """Tous les élèves qui n'ont rien envoyé passent en « devoir non fait »."""
    hw = await _get(db, homework_id)
    students = (await db.scalars(
        select(Student.id).where(Student.level == hw.level, Student.is_active.is_(True))
    )).all()
    subs = {s.student_id: s for s in (await db.scalars(
        select(Submission).where(Submission.homework_id == homework_id)
    )).all()}
    for sid in students:
        sub = subs.get(sid)
        if sub is None:
            db.add(Submission(homework_id=homework_id, student_id=sid, status=SubmissionStatus.NOT_DONE, files=[]))
        elif sub.status == SubmissionStatus.PENDING:
            sub.status = SubmissionStatus.NOT_DONE
    await db.commit()


@router.post("/{homework_id}/correction", response_model=HomeworkOut, dependencies=[Depends(admin_user)])
async def publish_correction(homework_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    hw = await _get(db, homework_id)
    delete_upload(hw.correction_path)
    hw.correction_path = await save_upload(file, "corrections")
    hw.correction_published_at = datetime.now(timezone.utc)
    await db.commit()
    return hw
