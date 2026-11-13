from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import ExamPrep, ExamPrepSubmission, Level, Role, Semester, Student, Subject, User
from app.schemas import (
    ExamPrepForFamily, ExamPrepGradeIn, ExamPrepOut, ExamPrepSubmissionOut, ExamPrepSubmissionRow, ExamPrepUpdate,
)
from app.security import admin_user, current_user, get_accessible_student, my_students
from app.storage import delete_upload, normalize_video_url, save_upload

router = APIRouter(prefix="/api/exam-preps", tags=["entraînements contrôles"])


async def _get(db: AsyncSession, exam_prep_id: int) -> ExamPrep:
    ep = await db.get(ExamPrep, exam_prep_id)
    if ep is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "exam_prep_not_found")
    return ep


@router.get("", response_model=list[ExamPrepForFamily])
async def list_exam_preps(
    level: Level | None = None,
    subject: Subject | None = None,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(ExamPrep).order_by(ExamPrep.created_at.desc())
    if user.role == Role.ADMIN:
        if level:
            q = q.where(ExamPrep.level == level)
        if subject:
            q = q.where(ExamPrep.subject == subject)
        return [ExamPrepForFamily.model_validate(e) for e in (await db.scalars(q)).all()]

    students = await my_students(user, db)
    levels = {s.level for s in students}
    items = (await db.scalars(q.where(ExamPrep.level.in_(levels)))).all()
    subs = (await db.scalars(
        select(ExamPrepSubmission).where(ExamPrepSubmission.student_id.in_([s.id for s in students]))
    )).all()
    by_key = {(s.exam_prep_id, s.student_id): s for s in subs}

    result = []
    for ep in items:
        item = ExamPrepForFamily.model_validate(ep)
        item.my_submissions = {
            s.id: (ExamPrepSubmissionOut.model_validate(by_key[(ep.id, s.id)]) if (ep.id, s.id) in by_key else None)
            for s in students if s.level == ep.level
        }
        result.append(item)
    return result


@router.post("", response_model=ExamPrepOut, status_code=201, dependencies=[Depends(admin_user)])
async def create_exam_prep(
    level: Level = Form(...),
    subject: Subject = Form(...),
    semester: Semester = Form(...),
    control_number: int = Form(..., ge=1, le=3),
    title: str = Form(...),
    statement: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
):
    ep = ExamPrep(level=level, subject=subject, semester=semester, control_number=control_number, title=title)
    if statement and statement.filename:
        ep.statement_path = await save_upload(statement, "exam-preps")
    db.add(ep)
    await db.commit()
    return ep


@router.patch("/{exam_prep_id}", response_model=ExamPrepOut, dependencies=[Depends(admin_user)])
async def update_exam_prep(exam_prep_id: int, data: ExamPrepUpdate, db: AsyncSession = Depends(get_db)):
    ep = await _get(db, exam_prep_id)
    if data.title is not None:
        ep.title = data.title
    if data.video_url is not None:
        ep.video_url = normalize_video_url(data.video_url) if data.video_url.strip() else None
    await db.commit()
    return ep


@router.delete("/{exam_prep_id}", status_code=204, dependencies=[Depends(admin_user)])
async def delete_exam_prep(exam_prep_id: int, db: AsyncSession = Depends(get_db)):
    ep = await _get(db, exam_prep_id)
    subs = (await db.scalars(
        select(ExamPrepSubmission).where(ExamPrepSubmission.exam_prep_id == exam_prep_id)
    )).all()
    for path in [ep.statement_path, ep.correction_path, *[f for s in subs for f in s.files]]:
        delete_upload(path)
    await db.delete(ep)
    await db.commit()


# ---------- Côté parent / élève : envoyer les photos ----------
@router.post("/{exam_prep_id}/submit", response_model=ExamPrepSubmissionOut)
async def submit_exam_prep(
    exam_prep_id: int,
    student_id: int = Form(...),
    files: list[UploadFile] = File(...),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    ep = await _get(db, exam_prep_id)
    student = await get_accessible_student(student_id, user, db)
    if student.level != ep.level:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "wrong_level")

    sub = await db.scalar(select(ExamPrepSubmission).where(
        ExamPrepSubmission.exam_prep_id == exam_prep_id, ExamPrepSubmission.student_id == student_id
    ))
    existing = sub.files if sub else []
    if len(existing) + len(files) > settings.max_files_per_submission:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "too_many_files")

    saved = [await save_upload(f, "exam-prep-submissions") for f in files]
    if sub is None:
        sub = ExamPrepSubmission(exam_prep_id=exam_prep_id, student_id=student_id, files=[])
        db.add(sub)
    sub.files = [*existing, *saved]
    sub.submitted_at = datetime.now(timezone.utc)
    await db.commit()
    return sub


# ---------- Côté prof : suivi et notation ----------
@router.get(
    "/{exam_prep_id}/submissions", response_model=list[ExamPrepSubmissionRow], dependencies=[Depends(admin_user)]
)
async def list_exam_prep_submissions(exam_prep_id: int, db: AsyncSession = Depends(get_db)):
    ep = await _get(db, exam_prep_id)
    students = (await db.scalars(
        select(Student).where(Student.level == ep.level, Student.is_active.is_(True)).order_by(Student.first_name)
    )).all()
    subs = {s.student_id: s for s in (await db.scalars(
        select(ExamPrepSubmission).where(ExamPrepSubmission.exam_prep_id == exam_prep_id)
    )).all()}
    return [
        ExamPrepSubmissionRow(
            student_id=s.id, first_name=s.first_name, last_name=s.last_name,
            files=subs[s.id].files if s.id in subs else [],
            grade=subs[s.id].grade if s.id in subs else None,
            submitted_at=subs[s.id].submitted_at if s.id in subs else None,
        )
        for s in students
    ]


@router.put(
    "/{exam_prep_id}/submissions/{student_id}", response_model=ExamPrepSubmissionRow, dependencies=[Depends(admin_user)]
)
async def grade_submission(
    exam_prep_id: int, student_id: int, data: ExamPrepGradeIn, db: AsyncSession = Depends(get_db)
):
    ep = await _get(db, exam_prep_id)
    student = await db.get(Student, student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student_not_found")
    sub = await db.scalar(select(ExamPrepSubmission).where(
        ExamPrepSubmission.exam_prep_id == exam_prep_id, ExamPrepSubmission.student_id == student_id
    ))
    if sub is None:
        sub = ExamPrepSubmission(exam_prep_id=exam_prep_id, student_id=student_id, files=[])
        db.add(sub)
    sub.grade = data.grade
    await db.commit()
    return ExamPrepSubmissionRow(
        student_id=student.id, first_name=student.first_name, last_name=student.last_name,
        files=sub.files, grade=sub.grade, submitted_at=sub.submitted_at,
    )


@router.post("/{exam_prep_id}/correction", response_model=ExamPrepOut, dependencies=[Depends(admin_user)])
async def publish_correction(exam_prep_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    ep = await _get(db, exam_prep_id)
    delete_upload(ep.correction_path)
    ep.correction_path = await save_upload(file, "exam-prep-corrections")
    ep.correction_published_at = datetime.now(timezone.utc)
    await db.commit()
    return ep
