import { useI18n } from "../i18n";
import type { ScheduleSlot } from "../types";
import { LevelBadge, SubjectBadge } from "../ui";

export const todayWeekday = () => (new Date().getDay() + 6) % 7;

/** Prochain créneau à venir (aujourd'hui plus tard, ou les jours suivants). */
export function nextSlot(slots: ScheduleSlot[]): { slot: ScheduleSlot; inDays: number } | null {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const today = todayWeekday();
  for (let inDays = 0; inDays < 7; inDays++) {
    const wd = (today + inDays) % 7;
    const found = slots
      .filter((s) => s.weekday === wd && (inDays > 0 || s.start > hhmm))
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    if (found) return { slot: found, inDays };
  }
  return null;
}

export default function WeekSchedule({ slots, compact = false }: { slots: ScheduleSlot[]; compact?: boolean }) {
  const { t, weekdayName } = useI18n();
  const today = todayWeekday();
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => slots.some((s) => s.weekday === d));

  if (days.length === 0) return <p className="py-4 text-center text-sm text-slate-400">{t("no_schedule")}</p>;

  return (
    <div className={`grid gap-2 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
      {days.map((d) => (
        <div
          key={d}
          className={`rounded-xl p-3 ring-1 ${d === today ? "bg-indigo-50 ring-indigo-200" : "bg-slate-50 ring-slate-100"}`}
        >
          <p className={`mb-2 text-xs font-semibold uppercase ${d === today ? "text-indigo-700" : "text-slate-500"}`}>
            {weekdayName(d)} {d === today && `· ${t("today")}`}
          </p>
          <ul className="space-y-1.5">
            {slots
              .filter((s) => s.weekday === d)
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span dir="ltr" className="font-mono text-xs text-slate-600">{s.start}–{s.end}</span>
                  <LevelBadge level={s.level} />
                  {s.subject && <SubjectBadge subject={s.subject} />}
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
