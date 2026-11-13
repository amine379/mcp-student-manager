from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models import ContentType, Level, Role, Semester, Subject, SubmissionStatus

HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"
SlotStr = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$")]


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


class ParentUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=6)


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
    username: str | None = Field(default=None, min_length=3, max_length=50)
    password: str | None = Field(default=None, min_length=6)


class StudentOut(ORM):
    id: int
    first_name: str
    last_name: str
    level: Level
    parent_id: int | None
    user_id: int | None
    is_active: bool
    username: str | None = None


# ---------- Séances ----------
class LessonIn(BaseModel):
    level: Level
    date: date
    slot: SlotStr
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
    slot: str
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
    slot: str
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


# ---------- Entraînements contrôles (préparation, accumulés au fil des séances) ----------
class ExamPrepSubmissionOut(ORM):
    id: int
    student_id: int
    files: list[str]
    grade: str | None
    submitted_at: datetime | None


class ExamPrepOut(ORM):
    id: int
    level: Level
    subject: Subject
    semester: Semester
    control_number: int
    title: str
    statement_path: str | None
    correction_path: str | None
    correction_published_at: datetime | None
    video_url: str | None
    created_at: datetime


class ExamPrepForFamily(ExamPrepOut):
    # une entrée par enfant concerné (student_id -> soumission)
    my_submissions: dict[int, ExamPrepSubmissionOut | None] = {}


class ExamPrepSubmissionRow(BaseModel):
    student_id: int
    first_name: str
    last_name: str
    files: list[str]
    grade: str | None
    submitted_at: datetime | None


class ExamPrepGradeIn(BaseModel):
    grade: str | None = Field(default=None, max_length=20)


class ExamPrepUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    video_url: str | None = None


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


# ---------- Emploi du temps ----------
class ScheduleSlotIn(BaseModel):
    weekday: int = Field(ge=0, le=6)
    start: str = Field(pattern=HHMM)
    end: str = Field(pattern=HHMM)
    level: Level
    subject: Subject | None = None


class ScheduleSlotOut(ScheduleSlotIn, ORM):
    id: int


# ---------- Documents des familles ----------
class FamilyDocumentOut(ORM):
    id: int
    student_id: int
    title: str
    note: str | None
    file_path: str
    created_at: datetime
    uploaded_by: int | None
    uploaded_by_name: str | None = None
    student_name: str | None = None


# ---------- Messages (prof -> parent/élève précis) ----------
class MessageOut(ORM):
    id: int
    body: str
    attachment_path: str | None
    is_read: bool
    created_at: datetime
    sender_id: int | None
    sender_name: str | None = None
    recipient_id: int
    recipient_name: str | None = None


