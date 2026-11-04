import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../api";
import WeekSchedule from "../../components/WeekSchedule";
import { useI18n } from "../../i18n";
import { LEVELS, SUBJECTS, WEEKDAYS, type Level, type ScheduleSlot, type Subject } from "../../types";
import { ErrorBox, Loader, PageTitle, useLoad, useSubmit } from "../../ui";

type Row = { key: number; weekday: number; start: string; end: string; level: Level; subject: Subject | "" };

let nextKey = 1;

const addMinutes = (hhmm: string, minutes: number) => {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
const toRow = (s: ScheduleSlot): Row => ({
  key: nextKey++, weekday: s.weekday, start: s.start, end: s.end, level: s.level, subject: s.subject ?? "",
});

export default function AdminSchedule() {
  const { t, weekdayName } = useI18n();
  const current = useLoad(() => api.get<ScheduleSlot[]>("/api/schedule"));
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useSubmit();

  useEffect(() => {
    if (current.data) setRows(current.data.map(toRow));
  }, [current.data]);

  const update = (key: number, patch: Partial<Row>) => {
    setSaved(false);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const add = () => {
    setSaved(false);
    const last = rows[rows.length - 1];
    // Enchaîne après le dernier créneau s'il reste de la place dans la soirée, sinon 19:00
    const start = last && last.end <= "22:00" ? last.end : "19:00";
    setRows([...rows, {
      key: nextKey++, weekday: last?.weekday ?? 0, start, end: addMinutes(start, 90), level: "1AC", subject: "",
    }]);
  };
  const remove = (key: number) => {
    setSaved(false);
    setRows(rows.filter((r) => r.key !== key));
  };

  const save = async () => {
    const body = rows.map(({ weekday, start, end, level, subject }) => ({ weekday, start, end, level, subject: subject || null }));
    if (await run(async () => { await api.put("/api/schedule", body); })) {
      setSaved(true);
      current.reload();
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm text-indigo-700">← {t("back")}</Link>
      <PageTitle>{t("edit_schedule")}</PageTitle>

      <Loader state={current}>
        {() => (
          <>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.key} className="card grid grid-cols-2 gap-2 p-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr_1.3fr_auto] sm:items-end">
                  <label className="col-span-2 sm:col-span-1">
                    <span className="label">{t("weekday")}</span>
                    <select className="input capitalize" value={r.weekday} onChange={(e) => update(r.key, { weekday: Number(e.target.value) })}>
                      {WEEKDAYS.map((d) => <option key={d} value={d}>{weekdayName(d)}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="label">{t("start")}</span>
                    <input type="time" className="input" value={r.start} onChange={(e) => update(r.key, { start: e.target.value })} />
                  </label>
                  <label>
                    <span className="label">{t("end")}</span>
                    <input type="time" className="input" value={r.end} onChange={(e) => update(r.key, { end: e.target.value })} />
                  </label>
                  <label>
                    <span className="label">{t("level")}</span>
                    <select className="input" value={r.level} onChange={(e) => update(r.key, { level: e.target.value as Level })}>
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="label">{t("subject")}</span>
                    <select className="input" value={r.subject} onChange={(e) => update(r.key, { subject: e.target.value as Subject | "" })}>
                      <option value="">{t("any_subject")}</option>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(r.key)}
                    className="btn-danger col-span-2 sm:col-span-1"
                    aria-label={t("delete")}
                  >
                    ✕ <span className="sm:hidden">{t("delete")}</span>
                  </button>
                </div>
              ))}
            </div>

            <button className="btn-light w-full" onClick={add}>+ {t("add_slot")}</button>

            <ErrorBox error={error} />
            <div className="sticky bottom-20 z-10 flex items-center gap-3 md:bottom-4">
              <button className="btn flex-1 py-3 shadow-lg sm:flex-none" onClick={save} disabled={busy}>{t("save")}</button>
              {saved && <span className="rounded-lg bg-white px-2 py-1 text-sm text-emerald-700 shadow">{t("saved")}</span>}
            </div>

            <section className="card">
              <h2 className="mb-3 font-semibold">{t("schedule")}</h2>
              <WeekSchedule slots={current.data ?? []} />
            </section>
          </>
        )}
      </Loader>
    </div>
  );
}
