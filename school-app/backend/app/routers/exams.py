from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models import Level, Role, SchoolExam, Student, User
from app.schemas import ExamIn, ExamOut, ExamUpdate
from app.security import current_user, get_accessible_student, my_students
from app.storage import delete_upload, save_upload

router = APIRouter(prefix="/api/exams", tags=["contrôles"])


async def _get(db: AsyncSession, exam_id: int, user: User) -> SchoolExam:
    exam = await db.scalar(
        select(SchoolExam).where(SchoolExam.id == exam_id).options(selectinload(SchoolExam.student))
    )
    if exam is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "exam_not_found")
    await get_accessible_student(exam.student_id, user, db)
    return exam


@router.get("", response_model=list[ExamOut])
async def list_exams(
    level: Level | None = None,
    upcoming_only: bool = False,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(SchoolExam).join(Student).options(selectinload(SchoolExam.student)).order_by(SchoolExam.exam_date)
    if user.role != Role.ADMIN:
        q = q.where(SchoolExam.student_id.in_([s.id for s in await my_students(user, db)]))
    if level:
        q = q.where(Student.level == level)
    if upcoming_only:
        q = q.where(SchoolExam.exam_date >= date.today())
    return (await db.scalars(q)).all()


@router.post("", response_model=ExamOut, status_code=201)
async def create_exam(data: ExamIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await get_accessible_student(data.student_id, user, db)
    exam = SchoolExam(**data.model_dump(), created_by=user.id, files=[])
    db.add(exam)
    await db.commit()
    await db.refresh(exam, ["student"])
    return exam


@router.patch("/{exam_id}", response_model=ExamOut)
async def update_exam(
    exam_id: int, data: ExamUpdate, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    exam = await _get(db, exam_id, user)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(exam, key, value)
    await db.commit()
    return exam


@router.post("/{exam_id}/files", response_model=ExamOut)
async def upload_exam_copy(
    exam_id: int,
    files: list[UploadFile] = File(...),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    """Photo de la copie corrigée du contrôle (rendue par l'école)."""
    exam = await _get(db, exam_id, user)
    if len(exam.files) + len(files) > settings.max_files_per_submission:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "too_many_files")
    exam.files = [*exam.files, *[await save_upload(f, "exams") for f in files]]
    await db.commit()
    return exam


@router.delete("/{exam_id}", status_code=204)
async def delete_exam(exam_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    exam = await _get(db, exam_id, user)
    for f in exam.files:
        delete_upload(f)
    await db.delete(exam)
    await db.commit()
