import enum
from datetime import date, datetime

from sqlalchemy import (
    JSON, Boolean, Date, DateTime, Enum, ForeignKey, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Role(str, enum.Enum):
    ADMIN = "admin"
    PARENT = "parent"
    STUDENT = "student"


class Level(str, enum.Enum):
    AC1 = "1AC"
    AC2 = "2AC"
    AC3 = "3AC"


class Slot(str, enum.Enum):
    S1 = "19:00-20:30"
    S2 = "20:30-22:00"


class Subject(str, enum.Enum):
    MATH = "math"
    PHYSICS = "physics"
    SVT = "svt"


class ContentType(str, enum.Enum):
    COURSE = "course"
    EXERCISE = "exercise"
    CORRECTION = "correction"


class SubmissionStatus(str, enum.Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"
    NOT_DONE = "not_done"


def _enum(e):
    return Enum(e, values_callable=lambda x: [m.value for m in x], native_enum=False, length=20)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(_enum(Role))
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20))
    language: Mapped[str] = mapped_column(String(2), default="fr")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    children: Mapped[list["Student"]] = relationship(
        back_populates="parent", foreign_keys="Student.parent_id"
    )


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    first_name: Mapped[str] = mapped_column(String(60))
    last_name: Mapped[str] = mapped_column(String(60))
    level: Mapped[Level] = mapped_column(_enum(Level), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User | None] = relationship(foreign_keys=[user_id])
    parent: Mapped[User | None] = relationship(back_populates="children", foreign_keys=[parent_id])


class Lesson(Base):
    """Une séance (cours donné à un niveau, à une date et un créneau)."""

    __tablename__ = "lessons"
    __table_args__ = (UniqueConstraint("level", "date", "slot"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    level: Mapped[Level] = mapped_column(_enum(Level), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    slot: Mapped[Slot] = mapped_column(_enum(Slot))
    subject: Mapped[Subject] = mapped_column(_enum(Subject))
    title: Mapped[str] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    documents: Mapped[list["Document"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")
    attendances: Mapped[list["Attendance"]] = relationship(back_populates="lesson", cascade="all, delete-orphan")


class Document(Base):
    """PDF/image publié par le prof : cours, exercices ou correction."""

    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)
    type: Mapped[ContentType] = mapped_column(_enum(ContentType))
    title: Mapped[str] = mapped_column(String(200))
    file_path: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lesson: Mapped[Lesson] = relationship(back_populates="documents")


class Attendance(Base):
    __tablename__ = "attendances"
    __table_args__ = (UniqueConstraint("lesson_id", "student_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    present: Mapped[bool] = mapped_column(Boolean)

    lesson: Mapped[Lesson] = relationship(back_populates="attendances")
    student: Mapped[Student] = relationship()


class Homework(Base):
    __tablename__ = "homeworks"

    id: Mapped[int] = mapped_column(primary_key=True)
    level: Mapped[Level] = mapped_column(_enum(Level), index=True)
    subject: Mapped[Subject] = mapped_column(_enum(Subject))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    due_date: Mapped[date] = mapped_column(Date)
    statement_path: Mapped[str | None] = mapped_column(String(300))
    correction_path: Mapped[str | None] = mapped_column(String(300))
    correction_published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    submissions: Mapped[list["Submission"]] = relationship(back_populates="homework", cascade="all, delete-orphan")


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("homework_id", "student_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    homework_id: Mapped[int] = mapped_column(ForeignKey("homeworks.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    status: Mapped[SubmissionStatus] = mapped_column(_enum(SubmissionStatus), default=SubmissionStatus.PENDING)
    files: Mapped[list[str]] = mapped_column(JSON, default=list)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    homework: Mapped[Homework] = relationship(back_populates="submissions")
    student: Mapped[Student] = relationship()


class SchoolExam(Base):
    """Contrôle à l'école, déclaré par le parent ou l'élève (+ photo de la copie corrigée)."""

    __tablename__ = "school_exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"), index=True)
    subject: Mapped[Subject] = mapped_column(_enum(Subject))
    exam_date: Mapped[date] = mapped_column(Date, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    grade: Mapped[str | None] = mapped_column(String(20))
    files: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    student: Mapped[Student] = relationship()


class Feedback(Base):
    __tablename__ = "feedbacks"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"))
    message: Mapped[str] = mapped_column(Text)
    reply: Mapped[str | None] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User | None] = relationship()
    student: Mapped[Student | None] = relationship()
