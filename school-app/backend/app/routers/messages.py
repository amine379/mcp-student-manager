from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Message, Role, User
from app.schemas import MessageOut
from app.security import admin_user, current_user
from app.storage import save_upload

router = APIRouter(prefix="/api/messages", tags=["messages"])


def _out(m: Message) -> MessageOut:
    out = MessageOut.model_validate(m)
    out.sender_name = m.sender.full_name if m.sender else None
    out.recipient_name = m.recipient.full_name if m.recipient else None
    return out


@router.get("", response_model=list[MessageOut])
async def list_messages(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    q = select(Message).options(selectinload(Message.sender), selectinload(Message.recipient))
    if user.role != Role.ADMIN:
        q = q.where(Message.recipient_id == user.id)
    return [_out(m) for m in (await db.scalars(q.order_by(Message.created_at.desc()))).all()]


@router.post("", response_model=MessageOut, status_code=201)
async def send_message(
    recipient_id: int = Form(...),
    body: str = Form(..., min_length=1, max_length=2000),
    file: UploadFile | None = File(None),
    user: User = Depends(admin_user),
    db: AsyncSession = Depends(get_db),
):
    recipient = await db.get(User, recipient_id)
    if recipient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "recipient_not_found")
    msg = Message(
        sender_id=user.id,
        recipient_id=recipient_id,
        body=body,
        attachment_path=await save_upload(file, "messages") if file else None,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg, ["sender", "recipient"])
    return _out(msg)


@router.put("/{message_id}/read", response_model=MessageOut)
async def mark_read(message_id: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    msg = await db.scalar(
        select(Message).where(Message.id == message_id)
        .options(selectinload(Message.sender), selectinload(Message.recipient))
    )
    if msg is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "message_not_found")
    if user.role != Role.ADMIN and msg.recipient_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not_your_message")
    msg.is_read = True
    await db.commit()
    return _out(msg)
