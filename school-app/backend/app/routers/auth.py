from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.schemas import LanguageIn, LoginIn, PasswordChangeIn, TokenOut, UserOut
from app.security import create_token, current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
async def login(data: LoginIn, db: AsyncSession = Depends(get_db)):
    user = await db.scalar(select(User).where(User.username == data.username.strip().lower()))
    if user is None or not user.is_active or not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid_credentials")
    return TokenOut(access_token=create_token(user))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user


@router.put("/password", status_code=204)
async def change_password(
    data: PasswordChangeIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "wrong_password")
    user.password_hash = hash_password(data.new_password)
    await db.commit()


@router.put("/language", response_model=UserOut)
async def set_language(data: LanguageIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    user.language = data.language
    await db.commit()
    return user
