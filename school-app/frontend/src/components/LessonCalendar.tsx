import { useCallback, useMemo, useState, type ReactNode } from "react";

import { useI18n } from "../i18n";
import type { Lesson, Subject } from "../types";
import { Modal, todayISO } from "../ui";

const DOT: Record<Subject, string> = {
  math: "bg-lavender",
  physics: "bg-sun",
  svt: "bg-mint",
};

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Calendrier du mois ; un clic sur un jour avec séances ouvre le détail en popup. */
export default function LessonCalendar({
  lessons,
  renderLesson,
}: {
  lessons: Lesson[];
  renderLesson: (l: Lesson) => ReactNode;
}) {
  const { t, weekdayName, monthLabel, fmtDate } = useI18n();
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);

  const byDate = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) map.set(l.date, [...(map.get(l.date) ?? []), l]);
    for (const list of map.values()) list.sort((a, b) => a.slot.localeCompare(b.slot));
    return map;
  }, [lessons]);

  const cells = useMemo(() => {
    const lead = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7; // lundi = 0
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= days; d++) out.push(iso(cursor.y, cursor.m, d));
    while (out.length % 7) out.push(null);
    return out;
  }, [cursor]);

  const move = (delta: number) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const goToday = () => {
    const d = new Date();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const monthCount = cells.reduce((n, day) => n + (day ? (byDate.get(day)?.length ?? 0) : 0), 0);
  const dayLessons = open ? (byDate.get(open) ?? []) : [];

  return (
    <div className="card p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2">
        <button className="btn-light h-10 w-10 p-0" onClick={() => move(-1)} aria-label={t("prev_month")}>
          <span className="inline-block text-lg rtl:rotate-180">‹</span>
        </button>
        <div className="flex-1 text-center">
          <h2 className="font-semibold capitalize">{monthLabel(cursor.y, cursor.m)}</h2>
          <p className="text-xs text-slate-400">{monthCount} {t("sessions_count")}</p>
        </div>
        <button className="btn-light h-10 w-10 p-0" onClick={() => move(1)} aria-label={t("next_month")}>
          <span className="inline-block text-lg rtl:rotate-180">›</span>
        </button>
        <button className="btn-light h-10 px-3 text-xs" onClick={goToday}>{t("today")}</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="pb-1 text-[11px] font-medium uppercase text-slate-400">
            {weekdayName(i, "short")}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ls = byDate.get(day) ?? [];
          const isToday = day === today;
          return (
            <button
              key={day}
              disabled={ls.length === 0}
              onClick={() => setOpen(day)}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition ${
                ls.length ? "bg-lavender-soft font-semibold text-ink hover:bg-lavender" : "text-slate-400"
              } ${isToday ? "ring-2 ring-ink" : ""}`}
            >
              {Number(day.slice(8))}
              <span className="flex h-1.5 gap-0.5">
                {ls.slice(0, 3).map((l) => (
                  <span key={l.id} className={`h-1.5 w-1.5 rounded-full ${DOT[l.subject]}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <Modal title={<span className="capitalize">{fmtDate(open)}</span>} onClose={close}>
          <div className="space-y-3">{dayLessons.map((l) => <div key={l.id}>{renderLesson(l)}</div>)}</div>
        </Modal>
      )}
    </div>
  );
}
