from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import ContentType, Level, Role, Slot, Subject, SubmissionStatus


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------
class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(ORM):
    id: int
    username: str
    role: Role
    full_name: str
    phone: str | None
    language: str


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


class LanguageIn(BaseModel):
    language: str = Field(pattern="^(fr|ar)$")


class PasswordResetIn(BaseModel):
    new_password: str = Field(min_length=6)


# ---------- Comptes ----------
class ParentIn(BaseModel):
    full_name: str
    phone: str | None = None
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)


class ParentOut(UserOut):
    children: list["StudentOut"] = []


class StudentIn(BaseModel):
    first_name: str
    last_name: str
    level: Level
    parent_id: int | None = None
    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=6)


class StudentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    level: Level | None = None
    parent_id: int | None = None
    is_active: bool | None = None


class StudentOut(ORM):
    id: int
    first_name: str
    last_name: str
    level: Level
    parent_id: int | None
    user_id: int | None
    is_active: bool


# ---------- Séances ----------
class LessonIn(BaseModel):
    level: Level
    date: date
    slot: Slot
    subject: Subject
    title: str
    notes: str | None = None


class DocumentOut(ORM):
    id: int
    type: ContentType
    title: str
    file_path: str
    created_at: datetime


class LessonOut(ORM):
    id: int
    level: Level
    date: date
    slot: Slot
    subject: Subject
    title: str
    notes: str | None
    documents: list[DocumentOut] = []


class AttendanceItem(BaseModel):
    student_id: int
    present: bool


class AttendanceRow(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    present: bool | None


class AbsenceOut(BaseModel):
    lesson_id: int
    date: date
    slot: Slot
    subject: Subject
    title: str


# ---------- Devoirs ----------
class SubmissionOut(ORM):
    id: int
    student_id: int
    status: SubmissionStatus
    files: list[str]
    submitted_at: datetime | None


class HomeworkOut(ORM):
    id: int
    level: Level
    subject: Subject
    title: str
    description: str | None
    due_date: date
    statement_path: str | None
    correction_path: str | None
    correction_published_at: datetime | None
    created_at: datetime


class HomeworkForFamily(HomeworkOut):
    # une entrée par enfant concerné (student_id -> soumission)
    my_submissions: dict[int, SubmissionOut | None] = {}


class SubmissionRow(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    status: SubmissionStatus
    files: list[str]
    submitted_at: datetime | None


class SubmissionStatusIn(BaseModel):
    status: SubmissionStatus


# ---------- Contrôles école ----------
class ExamIn(BaseModel):
    student_id: int
    subject: Subject
    exam_date: date
    description: str | None = None


class ExamUpdate(BaseModel):
    exam_date: date | None = None
    description: str | None = None
    grade: str | None = Field(default=None, max_length=20)


class ExamOut(ORM):
    id: int
    student_id: int
    subject: Subject
    exam_date: date
    description: str | None
    grade: str | None
    files: list[str]
    created_at: datetime
    student: StudentOut


# ---------- Feedback ----------
class FeedbackIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    student_id: int | None = None


class FeedbackReplyIn(BaseModel):
    reply: str = Field(min_length=1, max_length=2000)


class FeedbackOut(ORM):
    id: int
    message: str
    reply: str | None
    is_read: bool
    created_at: datetime
    author: str | None = None
    student_name: str | None = None
