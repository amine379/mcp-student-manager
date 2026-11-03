from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Level, Role, Student, User
from app.schemas import ParentIn, ParentOut, PasswordResetIn, StudentIn, StudentOut, StudentUpdate
from app.security import admin_user, current_user, hash_password, my_students

router = APIRouter(prefix="/api", tags=["comptes"])


async def _ensure_username_free(db: AsyncSession, username: str) -> str:
    username = username.strip().lower()
    if await db.scalar(select(User.id).where(User.username == username)):
        raise HTTPException(status.HTTP_409_CONFLICT, "username_taken")
    return username


async def _ensure_parent(db: AsyncSession, parent_id: int | None) -> None:
    if parent_id is None:
        return
    parent = await db.get(User, parent_id)
    if parent is None or parent.role != Role.PARENT:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "parent_not_found")


# ---------- Parents ----------
@router.get("/parents", response_model=list[ParentOut], dependencies=[Depends(admin_user)])
async def list_parents(db: AsyncSession = Depends(get_db)):
    q = select(User).where(User.role == Role.PARENT).options(selectinload(User.children)).order_by(User.full_name)
    return (await db.scalars(q)).all()


@router.post("/parents", response_model=ParentOut, status_code=201, dependencies=[Depends(admin_user)])
async def create_parent(data: ParentIn, db: AsyncSession = Depends(get_db)):
    parent = User(
        username=await _ensure_username_free(db, data.username),
        password_hash=hash_password(data.password),
        role=Role.PARENT,
        full_name=data.full_name,
        phone=data.phone,
    )
    db.add(parent)
    await db.commit()
    await db.refresh(parent, ["children"])
    return parent


# ---------- Élèves ----------
@router.get("/students", response_model=list[StudentOut])
async def list_students(
    level: Level | None = None,
    include_inactive: bool = False,
    user: User = Depends(current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != Role.ADMIN:
        return await my_students(user, db)
    q = select(Student).order_by(Student.level, Student.first_name)
    if level:
        q = q.where(Student.level == level)
    if not include_inactive:
        q = q.where(Student.is_active.is_(True))
    return (await db.scalars(q)).all()


@router.post("/students", response_model=StudentOut, status_code=201, dependencies=[Depends(admin_user)])
async def create_student(data: StudentIn, db: AsyncSession = Depends(get_db)):
    await _ensure_parent(db, data.parent_id)
    if not data.parent_id and not data.username:
        # sans parent, l'élève doit pouvoir se connecter lui-même
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "parent_or_login_required")

    student = Student(
        first_name=data.first_name, last_name=data.last_name, level=data.level, parent_id=data.parent_id
    )
    if data.username:
        if not data.password:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "password_required")
        login = User(
            username=await _ensure_username_free(db, data.username),
            password_hash=hash_password(data.password),
            role=Role.STUDENT,
            full_name=f"{data.first_name} {data.last_name}",
        )
        db.add(login)
        await db.flush()
        student.user_id = login.id

    db.add(student)
    await db.commit()
    return student


@router.patch("/students/{student_id}", response_model=StudentOut, dependencies=[Depends(admin_user)])
async def update_student(student_id: int, data: StudentUpdate, db: AsyncSession = Depends(get_db)):
    student = await db.get(Student, student_id)
    if student is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student_not_found")
    changes = data.model_dump(exclude_unset=True)
    if "parent_id" in changes:
        await _ensure_parent(db, changes["parent_id"])
    for key, value in changes.items():
        setattr(student, key, value)
    if student.user_id and "is_active" in changes:
        login = await db.get(User, student.user_id)
        login.is_active = student.is_active
    await db.commit()
    return student


@router.post("/users/{user_id}/reset-password", status_code=204, dependencies=[Depends(admin_user)])
async def reset_password(user_id: int, data: PasswordResetIn, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if user is None or user.role == Role.ADMIN:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "user_not_found")
    user.password_hash = hash_password(data.new_password)
    await db.commit()
