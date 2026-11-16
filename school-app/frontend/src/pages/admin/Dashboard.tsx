import { Link } from "react-router-dom";

import { api } from "../../api";
import WeekSchedule from "../../components/WeekSchedule";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import { LEVELS, type FamilyDoc, type Level, type NotificationSummary, type ScheduleSlot, type Subject } from "../../types";
import { Empty, Glyph, LevelBadge, Loader, StatTile, SubjectBadge, SubjectChip, useLoad } from "../../ui";

interface AdminDash {
  students_per_level: Partial<Record<Level, number>>;
  today_schedule: { start: string; end: string; level: Level; subject: Subject | null }[];
  upcoming_exams: { id: number; date: string; subject: Subject; student: string; level: Level }[];
  open_homeworks: { id: number; title: string; level: Level; due_date: string; submitted: number; total: number }[];
  unread_messages: number;
}

export default function AdminDashboard() {
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const state = useLoad(() => api.get<AdminDash>("/api/dashboard"));
  const schedule = useLoad(() => api.get<ScheduleSlot[]>("/api/schedule"));
  const docs = useLoad(() => api.get<FamilyDoc[]>("/api/family-documents"));
  const notifs = useLoad(() => api.get<NotificationSummary>("/api/notifications/summary"));

  return (
    <Loader state={state}>
      {(d) => (
        <div className="space-y-4">
          <div className="rounded-3xl border border-ink bg-lavender p-5 text-ink">
            <p className="text-sm text-ink/70">{t("hello")}</p>
            <h1 className="text-2xl font-bold">{user?.full_name}</h1>
            <p className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-sm font-semibold">
              {d.today_schedule.length === 0 ? t("no_class_today") : `${d.today_schedule.length} ${t("sessions_today")}`}
            </p>
          </div>

          <section className="card">
            <h2 className="mb-1 font-semibold">{t("nav_notifications")}</h2>
            <p className="mb-3 text-xs text-neutral-500">{t("notifications_hint")}</p>
            <Loader state={notifs}>
              {(n) => {
                const total = n.absence + n.homework + n.exam_prep;
                return total === 0 ? (
                  <p className="rounded-2xl bg-mint-soft px-4 py-3 text-sm font-semibold">✓ {t("all_sent")}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <Link to="/notifications/absence" className="active:scale-95">
                      <StatTile tone="lilac" value={n.absence} label={t("case_absence")} />
                    </Link>
                    <Link to="/notifications/homework" className="active:scale-95">
                      <StatTile tone="sun" value={n.homework} label={t("case_homework")} />
                    </Link>
                    <Link to="/notifications/exam_prep" className="active:scale-95">
                      <StatTile tone="mint" value={n.exam_prep} label={t("case_exam_prep")} />
                    </Link>
                  </div>
                );
              }}
            </Loader>
          </section>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {LEVELS.map((l, i) => (
              <StatTile
                key={l}
                tone={(["lavender", "sun", "lilac"] as const)[i]}
                value={d.students_per_level[l] ?? 0}
                label={t("students_count")}
                badge={<span className="badge bg-white">{l}</span>}
              />
            ))}
            <Link to="/messages" className="active:scale-95">
              <StatTile
                tone="mint"
                value={d.unread_messages}
                label={t("unread_messages")}
                badge={<span className="badge bg-white">{t("nav_messages")}</span>}
              />
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
                  <li key={s.start} className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-2.5 text-sm">
                    {s.subject ? <SubjectChip subject={s.subject} size={36} /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white"><Glyph name="clock" className="h-4 w-4" /></span>}
                    <span className="min-w-0 flex-1">
                      <span dir="ltr" className="block font-bold tabular-nums">{s.start}–{s.end}</span>
                      <span className="block truncate text-xs text-neutral-500">{t(s.level)}</span>
                    </span>
                    <LevelBadge level={s.level} />
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
                      <Link to={`/homeworks/${h.id}`} className="flex items-center gap-2 py-2.5 text-sm hover:underline">
                        <LevelBadge level={h.level} />
                        <span className="min-w-0 flex-1 truncate">{h.title}</span>
                        <span className="text-xs text-slate-500">{fmtDate(h.due_date)}</span>
                        <span className="badge bg-mint-soft">{h.submitted}/{h.total}</span>
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
              <Link to="/documents" className="text-xs font-medium font-semibold text-ink">{t("see_all")} →</Link>
            </div>
            <Loader state={docs}>
              {(list) => list.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-slate-100">
                  {list.slice(0, 5).map((doc) => (
                    <li key={doc.id}>
                      <a href={doc.file_path} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-2.5 text-sm hover:underline">
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
