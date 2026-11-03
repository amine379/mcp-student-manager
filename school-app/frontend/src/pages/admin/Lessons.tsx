import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../../api";
import { useI18n } from "../../i18n";
import { LEVELS, SLOTS, SUBJECTS, type Lesson, type Level, type Slot } from "../../types";
import { Collapsible, Empty, ErrorBox, Field, LevelBadge, Loader, PageTitle, SubjectBadge, todayISO, useLoad, useSubmit } from "../../ui";

type Schedule = Record<string, Record<Slot, Level>>;

export default function AdminLessons() {
  const { t, fmtDate } = useI18n();
  const [level, setLevel] = useState<Level | "">("");
  const lessons = useLoad(() => api.get<Lesson[]>(`/api/lessons${level ? `?level=${level}` : ""}`), [level]);

  return (
    <div className="space-y-4">
      <PageTitle>{t("nav_lessons")}</PageTitle>
      <Collapsible label={t("new_lesson")}>{(close) => <LessonForm onCancel={close} />}</Collapsible>

      <select className="input w-auto" value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
        <option value="">{t("all_levels")}</option>
        {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
      </select>

      <Loader state={lessons}>
        {(list) => list.length === 0 ? <Empty /> : (
          <div className="card divide-y divide-slate-100 p-0">
            {list.map((l) => (
              <Link key={l.id} to={`/lessons/${l.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
                <span className="w-28 shrink-0 text-xs font-medium text-slate-600">{fmtDate(l.date)}</span>
                <LevelBadge level={l.level} />
                <SubjectBadge subject={l.subject} />
                <span className="flex-1 font-medium">{l.title}</span>
                <span className="text-xs text-slate-400">📎 {l.documents.length}</span>
              </Link>
            ))}
          </div>
        )}
      </Loader>
    </div>
  );
}

function LessonForm({ onCancel }: { onCancel: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const schedule = useLoad(() => api.get<Schedule>("/api/schedule"));
  const [f, setF] = useState({ date: todayISO(), slot: SLOTS[0] as Slot, level: "1AC" as Level, subject: "math", title: "", notes: "" });
  const { busy, error, run } = useSubmit();

  // Pré-remplit le niveau selon l'emploi du temps du jour / créneau choisi
  useEffect(() => {
    const weekday = (new Date(`${f.date}T12:00:00`).getDay() + 6) % 7;
    const planned = schedule.data?.[String(weekday)]?.[f.slot];
    if (planned) setF((prev) => ({ ...prev, level: planned }));
  }, [f.date, f.slot, schedule.data]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let created: Lesson | undefined;
    if (await run(async () => { created = await api.post<Lesson>("/api/lessons", { ...f, notes: f.notes || null }); }))
      navigate(`/lessons/${created!.id}`);
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("new_lesson")}</h3>
      <Field label={t("date")}><input type="date" className="input" value={f.date} onChange={set("date")} required /></Field>
      <Field label={t("slot")}>
        <select className="input" dir="ltr" value={f.slot} onChange={set("slot")}>
          {SLOTS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label={t("level")}>
        <select className="input" value={f.level} onChange={set("level")}>
          {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
        </select>
      </Field>
      <Field label={t("subject")}>
        <select className="input" value={f.subject} onChange={set("subject")}>
          {SUBJECTS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label={t("title")}><input className="input" value={f.title} onChange={set("title")} required /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field label={t("notes")}><textarea className="input" rows={2} value={f.notes} onChange={set("notes")} /></Field>
      </div>
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn" disabled={busy}>{t("save")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}
