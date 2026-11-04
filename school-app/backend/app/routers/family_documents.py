from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import FamilyDocument, Role, User
from app.schemas import FamilyDocumentOut
from app.security import current_user, get_accessible_student, my_students
from app.storage import delete_upload, save_upload

router = APIRouter(prefix="/api/family-documents", tags=["documents familles"])


def _out(d: FamilyDocument) -> FamilyDocumentOut:
    out = FamilyDocumentOut.model_validate(d)
    out.uploaded_by_name = d.uploader.full_name if d.uploader else None
    out.student_name = f"{d.student.first_name} {d.student.last_name}"
    return out


@router.get("", response_model=list[FamilyDocumentOut])
async def list_documents(
    student_id: int | None = None, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    q = (
        select(FamilyDocument)
        .options(selectinload(FamilyDocument.student), selectinload(FamilyDocument.uploader))
        .order_by(FamilyDocument.created_at.desc())
    )
    if user.role != Role.ADMIN:
        q = q.where(FamilyDocument.student_id.in_([s.id for s in await my_students(user, db)]))
    if student_id is not None:
        q = q.where(FamilyDocument.student_id == student_id)
    return [_out(d) for d in (await db.scalars(q)).all()]


@router.post("", response_model=FamilyDocumentOut, status_code=201)
async def upload_document(
    student_id: int = Form(...),
    title: str = Form(..., min_length=1, max_length=200),
    note: str | None = Form(None),
    file: UploadFile = File(...),
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_accessible_student(student_id, user, db)
    doc = FamilyDocument(
        student_id=student_id, title=title, note=note or None,
        file_path=await save_upload(file, "family"), uploaded_by=user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc, ["student", "uploader"])
    return _out(doc)


@router.delete("/{doc_id}", status_code=204)
async def delete_document(doc_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    doc = await db.get(FamilyDocument, doc_id)
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "document_not_found")
    await get_accessible_student(doc.student_id, user, db)
    if user.role != Role.ADMIN and doc.uploaded_by != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not_your_document")
    delete_upload(doc.file_path)
    await db.delete(doc)
    await db.commit()
