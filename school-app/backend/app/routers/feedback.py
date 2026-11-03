from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Feedback, Role, User
from app.schemas import FeedbackIn, FeedbackOut, FeedbackReplyIn
from app.security import admin_user, current_user, get_accessible_student

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


def _out(f: Feedback) -> FeedbackOut:
    out = FeedbackOut.model_validate(f)
    out.author = f.user.full_name if f.user else None
    out.student_name = f"{f.student.first_name} {f.student.last_name}" if f.student else None
    return out


@router.get("", response_model=list[FeedbackOut])
async def list_feedback(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    q = select(Feedback).options(selectinload(Feedback.user), selectinload(Feedback.student))
    if user.role != Role.ADMIN:
        q = q.where(Feedback.user_id == user.id)
    return [_out(f) for f in (await db.scalars(q.order_by(Feedback.created_at.desc()))).all()]


@router.post("", response_model=FeedbackOut, status_code=201)
async def create_feedback(data: FeedbackIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if data.student_id is not None:
        await get_accessible_student(data.student_id, user, db)
    fb = Feedback(user_id=user.id, student_id=data.student_id, message=data.message)
    db.add(fb)
    await db.commit()
    await db.refresh(fb, ["user", "student"])
    return _out(fb)


async def _get(db: AsyncSession, feedback_id: int) -> Feedback:
    fb = await db.scalar(
        select(Feedback).where(Feedback.id == feedback_id)
        .options(selectinload(Feedback.user), selectinload(Feedback.student))
    )
    if fb is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "feedback_not_found")
    return fb


@router.put("/{feedback_id}/reply", response_model=FeedbackOut, dependencies=[Depends(admin_user)])
async def reply_feedback(feedback_id: int, data: FeedbackReplyIn, db: AsyncSession = Depends(get_db)):
    fb = await _get(db, feedback_id)
    fb.reply = data.reply
    fb.is_read = True
    await db.commit()
    return _out(fb)


@router.put("/{feedback_id}/read", response_model=FeedbackOut, dependencies=[Depends(admin_user)])
async def mark_read(feedback_id: int, db: AsyncSession = Depends(get_db)):
    fb = await _get(db, feedback_id)
    fb.is_read = True
    await db.commit()
    return _out(fb)
