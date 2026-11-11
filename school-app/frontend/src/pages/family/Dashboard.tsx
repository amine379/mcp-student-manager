import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api";
import WeekSchedule, { nextSlot } from "../../components/WeekSchedule";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import type { Absence, Level, ScheduleSlot, Subject } from "../../types";
import { Empty, Glyph, Loader, StatTile, SubjectChip, todayISO, useLoad } from "../../ui";

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
      <div>
        <p className="text-sm text-neutral-500">{t("hello")}</p>
        <h1 className="text-2xl font-bold tracking-tight">{user?.full_name}</h1>
      </div>
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
    <div className="overflow-hidden rounded-3xl border border-ink">
      <div className="border-b border-ink bg-lavender p-4 text-ink">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white font-bold">
            {c.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{c.name}</h2>
            <p className="text-xs text-ink/70">{t(c.level)}</p>
          </div>
          <span className="badge bg-white">{c.level}</span>
        </div>

        {next && (
          <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white p-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="text-xs font-medium text-ink/60">{t("next_class")}</p>
              <p className="font-semibold capitalize">
                {next.inDays === 0 ? t("today") : weekdayName(next.slot.weekday)}{" "}
                <span dir="ltr" className="tabular-nums">{next.slot.start}–{next.slot.end}</span>
              </p>
            </div>
            {next.slot.subject && <SubjectChip subject={next.slot.subject} size={36} />}
          </div>
        )}
      </div>

      <div className="space-y-5 bg-white p-4">
        <div className="grid grid-cols-3 gap-2">
          <Link to="/homeworks" className="text-start active:scale-95">
            <StatTile value={c.homeworks_todo.length} label={t("homeworks_todo")} tone="sun" />
          </Link>
          <button onClick={() => setShowAbs(!showAbs)} className="text-start active:scale-95">
            <StatTile value={c.absences} label={t("absences")} tone="lilac" />
          </button>
          <Link to="/exams" className="text-start active:scale-95">
            <StatTile value={c.upcoming_exams.length} label={t("nav_exams")} tone="mint" />
          </Link>
        </div>

        {showAbs && <AbsenceList studentId={c.id} />}

        <section>
          <SectionHead title={t("homeworks_todo")} to="/homeworks" />
          {c.homeworks_todo.length === 0 ? (
            <p className="rounded-2xl bg-mint-soft px-4 py-3 text-sm font-medium">{t("all_done")}</p>
          ) : (
            <ul className="space-y-2">
              {c.homeworks_todo.map((h) => {
                const late = h.due_date < today;
                return (
                  <li key={h.id}>
                    <Link to="/homeworks" className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-2.5 hover:bg-neutral-100">
                      <SubjectChip subject={h.subject} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{h.title}</span>
                        <span className="text-xs capitalize text-neutral-500">{t(h.subject)}</span>
                      </span>
                      <span className={`badge shrink-0 first-letter:uppercase ${late ? "bg-rose-100 text-rose-800" : "bg-white"}`}>
                        {late ? t("late") : fmtDate(h.due_date)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {c.upcoming_exams.length > 0 && (
          <section>
            <SectionHead title={t("nav_exams")} to="/exams" />
            <ul className="space-y-2">
              {c.upcoming_exams.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-2.5">
                  <SubjectChip subject={e.subject} size={36} />
                  <span className="min-w-0 flex-1 text-sm font-semibold">{t(e.subject)}</span>
                  <span className="badge shrink-0 bg-white capitalize">{fmtDate(e.date)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.last_lesson && (
          <Link to="/lessons" className="flex items-center gap-3 rounded-2xl bg-lavender-soft p-3 hover:bg-lavender">
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-ink/60">
                {t("last_lesson")} · <span className="capitalize">{fmtDate(c.last_lesson.date)}</span>
              </span>
              <span className="block truncate font-semibold">{c.last_lesson.title}</span>
            </span>
            <Glyph name="chevron" className="h-5 w-5 shrink-0" />
          </Link>
        )}

        <div>
          <button onClick={() => setShowWeek(!showWeek)} className="flex w-full items-center justify-between rounded-2xl py-1 text-sm font-bold">
            <span>{t("schedule")}</span>
            <Glyph name="chevron" className={`h-5 w-5 text-neutral-400 transition ${showWeek ? "rotate-90" : ""}`} />
          </button>
          {showWeek && <div className="mt-2"><WeekSchedule slots={slots} compact /></div>}
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, to }: { title: string; to: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-sm font-bold">{title}</h3>
      <Link to={to} className="text-xs font-semibold text-neutral-500 hover:text-ink">{t("see_all")} →</Link>
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
