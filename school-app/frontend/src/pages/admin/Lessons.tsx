import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../../api";
import LessonCalendar from "../../components/LessonCalendar";
import { useI18n } from "../../i18n";
import { LEVELS, SUBJECTS, type Lesson, type Level, type ScheduleSlot, type Subject } from "../../types";
import {
  Collapsible, ErrorBox, Field, LevelBadge, Loader, PageTitle, SubjectBadge, todayISO, useLoad, useSubmit,
} from "../../ui";

export default function AdminLessons() {
  const { t } = useI18n();
  const [level, setLevel] = useState<Level | "">("");
  const lessons = useLoad(() => api.get<Lesson[]>(`/api/lessons${level ? `?level=${level}` : ""}`), [level]);

  const row = (l: Lesson) => (
    <Link to={`/lessons/${l.id}`} className="block rounded-xl p-3 ring-1 ring-slate-200 hover:bg-slate-50">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span dir="ltr" className="font-mono text-slate-500">{l.slot}</span>
        <LevelBadge level={l.level} />
        <SubjectBadge subject={l.subject} />
      </div>
      <p className="mt-1 font-medium">{l.title}</p>
      <p className="mt-0.5 text-xs text-slate-400">{l.documents.length} {t("documents").toLowerCase()} · {t("open")} →</p>
    </Link>
  );

  return (
    <div className="space-y-4">
      <PageTitle>{t("nav_lessons")}</PageTitle>
      <Collapsible label={t("new_lesson")}>{(close) => <LessonForm onCancel={close} />}</Collapsible>

      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
          <option value="">{t("all_levels")}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
        </select>
      </div>

      <Loader state={lessons}>{(list) => <LessonCalendar lessons={list} renderLesson={row} />}</Loader>
    </div>
  );
}

const CUSTOM = "custom";

function LessonForm({ onCancel }: { onCancel: () => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const schedule = useLoad(() => api.get<ScheduleSlot[]>("/api/schedule"));
  const [date, setDate] = useState(todayISO());
  const [slotKey, setSlotKey] = useState<string>(CUSTOM);
  const [start, setStart] = useState("19:00");
  const [end, setEnd] = useState("20:30");
  const [level, setLevel] = useState<Level>("1AC");
  const [subject, setSubject] = useState<Subject>("math");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const { busy, error, run } = useSubmit();

  const daySlots = useMemo(() => {
    const wd = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
    return (schedule.data ?? []).filter((s) => s.weekday === wd).sort((a, b) => a.start.localeCompare(b.start));
  }, [date, schedule.data]);

  const applySlot = (s: ScheduleSlot) => {
    setSlotKey(String(s.id));
    setStart(s.start);
    setEnd(s.end);
    setLevel(s.level);
    if (s.subject) setSubject(s.subject);
  };

  // Le planning du jour pré-remplit créneau, niveau et matière
  useEffect(() => {
    if (daySlots.length) applySlot(daySlots[0]);
    else setSlotKey(CUSTOM);
  }, [daySlots]);

  const onSlotChange = (key: string) => {
    if (key === CUSTOM) return setSlotKey(CUSTOM);
    const s = daySlots.find((x) => String(x.id) === key);
    if (s) applySlot(s);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    let created: Lesson | undefined;
    const body = { date, slot: `${start}-${end}`, level, subject, title, notes: notes || null };
    if (await run(async () => { created = await api.post<Lesson>("/api/lessons", body); }))
      navigate(`/lessons/${created!.id}`);
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("new_lesson")}</h3>
      <Field label={t("date")}>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
      </Field>
      <Field label={t("slot")}>
        <select className="input" value={slotKey} onChange={(e) => onSlotChange(e.target.value)}>
          {daySlots.map((s) => (
            <option key={s.id} value={s.id}>{s.start}–{s.end} · {s.level}</option>
          ))}
          <option value={CUSTOM}>{t("custom_slot")}</option>
        </select>
      </Field>
      {slotKey === CUSTOM && (
        <>
          <Field label={t("start")}>
            <input type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} required />
          </Field>
          <Field label={t("end")}>
            <input type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} required />
          </Field>
        </>
      )}
      <Field label={t("level")}>
        <select className="input" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
          {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
        </select>
      </Field>
      <Field label={t("subject")}>
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
          {SUBJECTS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label={t("title")}><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field label={t("notes")}><textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn flex-1 sm:flex-none" disabled={busy}>{t("save")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}
