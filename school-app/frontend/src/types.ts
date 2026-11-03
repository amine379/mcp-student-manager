export type Role = "admin" | "parent" | "student";
export type Level = "1AC" | "2AC" | "3AC";
export type Slot = "19:00-20:30" | "20:30-22:00";
export type Subject = "math" | "physics" | "svt";
export type DocType = "course" | "exercise" | "correction";
export type SubStatus = "pending" | "submitted" | "not_done";

export const LEVELS: Level[] = ["1AC", "2AC", "3AC"];
export const SLOTS: Slot[] = ["19:00-20:30", "20:30-22:00"];
export const SUBJECTS: Subject[] = ["math", "physics", "svt"];
export const DOC_TYPES: DocType[] = ["course", "exercise", "correction"];

export interface User {
  id: number;
  username: string;
  role: Role;
  full_name: string;
  phone: string | null;
  language: "fr" | "ar";
}

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  level: Level;
  parent_id: number | null;
  user_id: number | null;
  is_active: boolean;
}

export interface Parent extends User {
  children: Student[];
}

export interface Doc {
  id: number;
  type: DocType;
  title: string;
  file_path: string;
  created_at: string;
}

export interface Lesson {
  id: number;
  level: Level;
  date: string;
  slot: Slot;
  subject: Subject;
  title: string;
  notes: string | null;
  documents: Doc[];
}

export interface AttendanceRow {
  student_id: number;
  first_name: string;
  last_name: string;
  present: boolean | null;
}

export interface Absence {
  lesson_id: number;
  date: string;
  slot: Slot;
  subject: Subject;
  title: string;
}

export interface Submission {
  id: number;
  student_id: number;
  status: SubStatus;
  files: string[];
  submitted_at: string | null;
}

export interface Homework {
  id: number;
  level: Level;
  subject: Subject;
  title: string;
  description: string | null;
  due_date: string;
  statement_path: string | null;
  correction_path: string | null;
  correction_published_at: string | null;
  created_at: string;
  my_submissions: Record<string, Submission | null>;
}

export interface SubmissionRow {
  student_id: number;
  first_name: string;
  last_name: string;
  status: SubStatus;
  files: string[];
  submitted_at: string | null;
}

export interface Exam {
  id: number;
  student_id: number;
  subject: Subject;
  exam_date: string;
  description: string | null;
  grade: string | null;
  files: string[];
  created_at: string;
  student: Student;
}

export interface Feedback {
  id: number;
  message: string;
  reply: string | null;
  is_read: boolean;
  created_at: string;
  author: string | null;
  student_name: string | null;
}
