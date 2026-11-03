import { Link } from "react-router-dom";

import { api } from "../../api";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import { LEVELS, type Level, type Subject } from "../../types";
import { Empty, LevelBadge, Loader, SubjectBadge, useLoad } from "../../ui";

interface AdminDash {
  students_per_level: Partial<Record<Level, number>>;
  today_schedule: Record<string, Level>;
  upcoming_exams: { id: number; date: string; subject: Subject; student: string; level: Level }[];
  open_homeworks: { id: number; title: string; level: Level; due_date: string; submitted: number; total: number }[];
  unread_feedback: number;
}

export default function AdminDashboard() {
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const state = useLoad(() => api.get<AdminDash>("/api/dashboard"));

  return (
    <Loader state={state}>
      {(d) => (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">
            {t("hello")} {user?.full_name} 👋
          </h1>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l) => (
              <div key={l} className="card">
                <LevelBadge level={l} />
                <p className="mt-2 text-2xl font-bold">{d.students_per_level[l] ?? 0}</p>
                <p className="text-xs text-slate-500">{t("students_count")}</p>
              </div>
            ))}
            <Link to="/feedback" className="card hover:ring-indigo-300">
              <span className="badge bg-rose-100 text-rose-700">💬</span>
              <p className="mt-2 text-2xl font-bold">{d.unread_feedback}</p>
              <p className="text-xs text-slate-500">{t("unread_feedback")}</p>
            </Link>
          </div>

          <section className="card">
            <h2 className="mb-2 font-semibold">{t("today")}</h2>
            {Object.keys(d.today_schedule).length === 0 ? (
              <p className="text-sm text-slate-500">{t("no_class_today")}</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(d.today_schedule).map(([slot, level]) => (
                  <li key={slot} className="flex items-center gap-3 text-sm">
                    <span dir="ltr" className="font-mono text-slate-500">{slot}</span>
                    <LevelBadge level={level} />
                    <span>{t(level)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/lessons" className="btn mt-3">{t("new_lesson")}</Link>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card">
              <h2 className="mb-2 font-semibold">{t("open_homeworks")}</h2>
              {d.open_homeworks.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-100">
                  {d.open_homeworks.map((h) => (
                    <li key={h.id}>
                      <Link to={`/homeworks/${h.id}`} className="flex items-center gap-2 py-2 text-sm hover:text-indigo-700">
                        <LevelBadge level={h.level} />
                        <span className="flex-1 truncate">{h.title}</span>
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
                    <li key={e.id} className="flex items-center gap-2 py-2 text-sm">
                      <span className="w-24 shrink-0 text-xs font-medium text-slate-600">{fmtDate(e.date)}</span>
                      <LevelBadge level={e.level} />
                      <span className="flex-1 truncate">{e.student}</span>
                      <SubjectBadge subject={e.subject} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </Loader>
  );
}
