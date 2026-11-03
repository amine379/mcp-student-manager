from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Role, Student, User

ALGORITHM = "HS256"
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user.id), "exp": expire}, settings.secret_key, algorithm=ALGORITHM)


async def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "not_authenticated")
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise unauthorized
    user = await db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise unauthorized
    return user


async def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != Role.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "admin_only")
    return user


async def my_students(user: User, db: AsyncSession) -> list[Student]:
    """Élèves visibles par l'utilisateur : tous (prof), ses enfants (parent), lui-même (élève)."""
    q = select(Student).where(Student.is_active.is_(True))
    if user.role == Role.PARENT:
        q = q.where(Student.parent_id == user.id)
    elif user.role == Role.STUDENT:
        q = q.where(Student.user_id == user.id)
    return list((await db.scalars(q.order_by(Student.level, Student.first_name))).all())


async def get_accessible_student(student_id: int, user: User, db: AsyncSession) -> Student:
    student = await db.get(Student, student_id)
    allowed = student is not None and (
        user.role == Role.ADMIN
        or (user.role == Role.PARENT and student.parent_id == user.id)
        or (user.role == Role.STUDENT and student.user_id == user.id)
    )
    if not allowed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student_not_found")
    return student
