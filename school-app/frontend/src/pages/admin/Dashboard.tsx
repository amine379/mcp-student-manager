import { Link } from "react-router-dom";

import { api } from "../../api";
import WeekSchedule from "../../components/WeekSchedule";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import { LEVELS, type FamilyDoc, type Level, type ScheduleSlot, type Subject } from "../../types";
import { Empty, LevelBadge, Loader, SubjectBadge, useLoad } from "../../ui";

interface AdminDash {
  students_per_level: Partial<Record<Level, number>>;
  today_schedule: { start: string; end: string; level: Level; subject: Subject | null }[];
  upcoming_exams: { id: number; date: string; subject: Subject; student: string; level: Level }[];
  open_homeworks: { id: number; title: string; level: Level; due_date: string; submitted: number; total: number }[];
  unread_feedback: number;
}

export default function AdminDashboard() {
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const state = useLoad(() => api.get<AdminDash>("/api/dashboard"));
  const schedule = useLoad(() => api.get<ScheduleSlot[]>("/api/schedule"));
  const docs = useLoad(() => api.get<FamilyDoc[]>("/api/family-documents"));

  return (
    <Loader state={state}>
      {(d) => (
        <div className="space-y-4">
          <h1 className="text-xl font-bold text-slate-900">{t("hello")}, {user?.full_name}</h1>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l) => (
              <div key={l} className="card p-3">
                <LevelBadge level={l} />
                <p className="mt-2 text-2xl font-bold">{d.students_per_level[l] ?? 0}</p>
                <p className="text-xs text-slate-500">{t("students_count")}</p>
              </div>
            ))}
            <Link to="/feedback" className="card p-3 hover:ring-indigo-300">
              <span className="badge bg-rose-100 text-rose-700">{t("nav_feedback")}</span>
              <p className="mt-2 text-2xl font-bold">{d.unread_feedback}</p>
              <p className="text-xs text-slate-500">{t("unread_feedback")}</p>
            </Link>
          </div>

          <section className="card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">{t("today")}</h2>
              <Link to="/lessons" className="btn px-3 py-1.5 text-xs">+ {t("new_lesson")}</Link>
            </div>
            {d.today_schedule.length === 0 ? (
              <p className="text-sm text-slate-500">{t("no_class_today")}</p>
            ) : (
              <ul className="space-y-2">
                {d.today_schedule.map((s) => (
                  <li key={s.start} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                    <span dir="ltr" className="font-mono font-semibold text-slate-700">{s.start}–{s.end}</span>
                    <LevelBadge level={s.level} />
                    <span className="text-slate-600">{t(s.level)}</span>
                    {s.subject && <SubjectBadge subject={s.subject} />}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">{t("schedule")}</h2>
              <Link to="/schedule" className="btn-light px-3 py-1.5 text-xs">{t("edit_schedule")}</Link>
            </div>
            <Loader state={schedule}>{(slots) => <WeekSchedule slots={slots} />}</Loader>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card">
              <h2 className="mb-2 font-semibold">{t("open_homeworks")}</h2>
              {d.open_homeworks.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-100">
                  {d.open_homeworks.map((h) => (
                    <li key={h.id}>
                      <Link to={`/homeworks/${h.id}`} className="flex items-center gap-2 py-2.5 text-sm hover:text-indigo-700">
                        <LevelBadge level={h.level} />
                        <span className="min-w-0 flex-1 truncate">{h.title}</span>
                        <span className="text-xs text-slate-500">{fmtDate(h.due_date)}</span>
                        <span className="badge bg-emerald-50 text-emerald-700">{h.submitted}/{h.total}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <h2 className="mb-2 font-semibold">{t("upcoming_exams")}</h2>
              {d.upcoming_exams.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-100">
                  {d.upcoming_exams.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 py-2.5 text-sm">
                      <span className="w-20 shrink-0 text-xs font-medium capitalize text-slate-600">{fmtDate(e.date)}</span>
                      <LevelBadge level={e.level} />
                      <span className="min-w-0 flex-1 truncate">{e.student}</span>
                      <SubjectBadge subject={e.subject} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-semibold">{t("family_documents")}</h2>
              <Link to="/documents" className="text-xs font-medium text-indigo-700">{t("see_all")} →</Link>
            </div>
            <Loader state={docs}>
              {(list) => list.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-100">
                  {list.slice(0, 5).map((doc) => (
                    <li key={doc.id}>
                      <a href={doc.file_path} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-2.5 text-sm hover:text-indigo-700">
                        <span className="min-w-0 flex-1 truncate font-medium">{doc.title}</span>
                        <span className="truncate text-xs text-slate-500">{doc.student_name}</span>
                        <span className="text-xs text-slate-400">{fmtDate(doc.created_at)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Loader>
          </section>
        </div>
      )}
    </Loader>
  );
}
