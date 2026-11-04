import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api";
import WeekSchedule, { nextSlot } from "../../components/WeekSchedule";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import type { Absence, Level, ScheduleSlot, Subject } from "../../types";
import { Empty, LevelBadge, Loader, SubjectBadge, todayISO, useLoad } from "../../ui";

interface Child {
  id: number;
  name: string;
  level: Level;
  absences: number;
  homeworks_todo: { id: number; title: string; subject: Subject; due_date: string }[];
  upcoming_exams: { id: number; subject: Subject; date: string }[];
  last_lesson: { id: number; title: string; date: string } | null;
}

export default function FamilyDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const state = useLoad(() => api.get<{ children: Child[] }>("/api/dashboard"));
  const schedule = useLoad(() => api.get<ScheduleSlot[]>("/api/schedule"));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{t("hello")}, {user?.full_name}</h1>
      <Loader state={state}>
        {(d) => d.children.length === 0 ? <Empty /> : (
          <div className="grid gap-4 md:grid-cols-2">
            {d.children.map((c) => (
              <ChildCard key={c.id} c={c} slots={(schedule.data ?? []).filter((s) => s.level === c.level)} />
            ))}
          </div>
        )}
      </Loader>
    </div>
  );
}

function ChildCard({ c, slots }: { c: Child; slots: ScheduleSlot[] }) {
  const { t, fmtDate, weekdayName } = useI18n();
  const [showAbs, setShowAbs] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const today = todayISO();
  const next = nextSlot(slots);

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
          {c.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{c.name}</h2>
          <p className="text-xs text-slate-500">{t(c.level)}</p>
        </div>
        <LevelBadge level={c.level} />
      </div>

      {next && (
        <div className="flex items-center gap-3 rounded-xl bg-indigo-50 p-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="text-xs font-medium text-indigo-700">{t("next_class")}</p>
            <p className="font-semibold capitalize text-slate-800">
              {next.inDays === 0 ? t("today") : weekdayName(next.slot.weekday)}{" "}
              <span dir="ltr" className="font-mono">{next.slot.start}–{next.slot.end}</span>
            </p>
          </div>
          {next.slot.subject && <SubjectBadge subject={next.slot.subject} />}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Link to="/homeworks" className="rounded-xl bg-amber-50 p-2.5 active:scale-95">
          <p className="text-xl font-bold text-amber-700">{c.homeworks_todo.length}</p>
          <p className="text-[11px] leading-tight text-amber-800">{t("homeworks_todo")}</p>
        </Link>
        <button onClick={() => setShowAbs(!showAbs)} className="rounded-xl bg-rose-50 p-2.5 active:scale-95">
          <p className="text-xl font-bold text-rose-700">{c.absences}</p>
          <p className="text-[11px] leading-tight text-rose-800">{t("absences")}</p>
        </button>
        <Link to="/exams" className="rounded-xl bg-emerald-50 p-2.5 active:scale-95">
          <p className="text-xl font-bold text-emerald-700">{c.upcoming_exams.length}</p>
          <p className="text-[11px] leading-tight text-emerald-800">{t("nav_exams")}</p>
        </Link>
      </div>

      {showAbs && <AbsenceList studentId={c.id} />}

      <div>
        <h3 className="mb-1 text-sm font-semibold">{t("homeworks_todo")}</h3>
        {c.homeworks_todo.length === 0 ? (
          <p className="text-sm text-emerald-700">{t("all_done")}</p>
        ) : (
          <ul className="space-y-1">
            {c.homeworks_todo.map((h) => (
              <li key={h.id}>
                <Link to="/homeworks" className="flex items-center gap-2 py-1 text-sm hover:text-indigo-700">
                  <SubjectBadge subject={h.subject} />
                  <span className="min-w-0 flex-1 truncate">{h.title}</span>
                  <span className={`text-xs ${h.due_date < today ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                    {fmtDate(h.due_date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {c.upcoming_exams.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">{t("nav_exams")}</h3>
          <ul className="space-y-1">
            {c.upcoming_exams.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <SubjectBadge subject={e.subject} />
                <span className="capitalize text-slate-600">{fmtDate(e.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {c.last_lesson && (
        <Link to="/lessons" className="block rounded-xl bg-slate-50 p-3 text-sm hover:bg-slate-100">
          <span className="text-xs text-slate-500">{t("last_lesson")} · <span className="capitalize">{fmtDate(c.last_lesson.date)}</span></span>
          <p className="font-medium">{c.last_lesson.title}</p>
        </Link>
      )}

      <div>
        <button onClick={() => setShowWeek(!showWeek)} className="flex w-full items-center justify-between text-sm font-semibold">
          <span>{t("schedule")}</span>
          <span className={`text-slate-400 transition ${showWeek ? "rotate-180" : ""}`}>▾</span>
        </button>
        {showWeek && <div className="mt-2"><WeekSchedule slots={slots} compact /></div>}
      </div>
    </div>
  );
}

function AbsenceList({ studentId }: { studentId: number }) {
  const { t, fmtDate } = useI18n();
  const list = useLoad(() => api.get<Absence[]>(`/api/students/${studentId}/absences`), [studentId]);
  return (
    <Loader state={list}>
      {(items) => items.length === 0 ? <Empty /> : (
        <ul className="space-y-1 rounded-xl bg-rose-50/60 p-3 text-sm">
          {items.map((a) => (
            <li key={a.lesson_id} className="flex flex-wrap items-center gap-2">
              <span className="text-rose-700">✗</span>
              <span className="capitalize">{fmtDate(a.date)}</span>
              <span className="text-xs text-slate-500" dir="ltr">{a.slot}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600">{t(a.subject)} — {a.title}</span>
            </li>
          ))}
        </ul>
      )}
    </Loader>
  );
}
