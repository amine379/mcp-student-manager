import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import { LEVELS, SUBJECTS, DOC_TYPES, type AttendanceRow, type DocType, type Lesson, type Level, type Parent, type Subject } from "../../types";
import { appLink, ErrorBox, Field, FileButton, LevelBadge, Loader, SubjectBadge, useLoad, useSubmit, VideoEmbed, WhatsAppButton } from "../../ui";

/** Boutons WhatsApp pour prévenir les parents du niveau qu'un contenu a été publié. */
function NotifyParents({ lesson, parents }: { lesson: Lesson; parents: Parent[] }) {
  const { t, fmtDate } = useI18n();
  const recipients = parents.filter((p) => p.children.some((c) => c.level === lesson.level));

  const message = (name: string) =>
    t("wa_lesson_text")
      .replace("{name}", name)
      .replace("{subject}", t(lesson.subject))
      .replace("{title}", lesson.title)
      .replace("{date}", fmtDate(lesson.date))
      .replace("{link}", appLink("/lessons"));

  if (lesson.documents.length === 0) return null;

  return (
    <section className="card">
      <h2 className="mb-1 font-semibold">{t("notify_parents")}</h2>
      <p className="mb-3 text-xs text-slate-500">{t("notify_lesson_hint")}</p>
      {recipients.length === 0 ? (
        <p className="text-sm text-slate-400">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {recipients.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-2 py-2.5 text-sm">
              <span className="min-w-32 flex-1">
                {p.full_name}
                {p.phone && <span className="ms-1 text-xs text-slate-400" dir="ltr">{p.phone}</span>}
              </span>
              <WhatsAppButton phone={p.phone} text={message(p.full_name)} label={t("wa_send")} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminLessonDetail() {
  const { id } = useParams();
  const { t, fmtDate } = useI18n();
  const navigate = useNavigate();
  const lesson = useLoad(() => api.get<Lesson>(`/api/lessons/${id}`), [id]);
  const parents = useLoad(() => api.get<Parent[]>("/api/parents"));
  const [editing, setEditing] = useState(false);

  const remove = async () => {
    if (!confirm(t("confirm_delete"))) return;
    await api.del(`/api/lessons/${id}`);
    navigate("/lessons");
  };

  return (
    <Loader state={lesson}>
      {(l) => (
        <div className="space-y-4">
          <Link to="/lessons" className="text-sm font-semibold text-ink">← {t("back")}</Link>
          {editing ? (
            <LessonEditForm lesson={l} onDone={() => { setEditing(false); lesson.reload(); }} onCancel={() => setEditing(false)} />
          ) : (
            <div className="card">
              <div className="flex flex-wrap items-center gap-2">
                <LevelBadge level={l.level} />
                <SubjectBadge subject={l.subject} />
                <span className="text-sm text-slate-500">{fmtDate(l.date)} · <span dir="ltr">{l.slot}</span></span>
                <div className="ms-auto flex gap-2">
                  <button className="btn-light" onClick={() => setEditing(true)}>{t("edit")}</button>
                  <button className="btn-danger" onClick={remove}>{t("delete")}</button>
                </div>
              </div>
              <h1 className="mt-2 text-xl font-bold">{l.title}</h1>
              {l.notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{l.notes}</p>}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Documents lesson={l} onChange={lesson.reload} />
            <Attendance lessonId={l.id} />
          </div>

          <NotifyParents lesson={l} parents={parents.data ?? []} />
        </div>
      )}
    </Loader>
  );
}

function LessonEditForm({ lesson, onDone, onCancel }: { lesson: Lesson; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [start, end0] = lesson.slot.split("-");
  const [f, setF] = useState({
    level: lesson.level, subject: lesson.subject, date: lesson.date, start, end: end0, title: lesson.title,
    notes: lesson.notes ?? "",
  });
  const { busy, error, run } = useSubmit();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      level: f.level, subject: f.subject, date: f.date, slot: `${f.start}-${f.end}`, title: f.title,
      notes: f.notes || null,
    };
    if (await run(() => api.put(`/api/lessons/${lesson.id}`, body))) onDone();
  };

  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("edit")}</h3>
      <Field label={t("date")}>
        <input type="date" className="input" value={f.date} onChange={set("date")} required />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={t("start")}><input type="time" className="input" value={f.start} onChange={set("start")} required /></Field>
        <Field label={t("end")}><input type="time" className="input" value={f.end} onChange={set("end")} required /></Field>
      </div>
      <Field label={t("level")}>
        <select className="input" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as Level })}>
          {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
        </select>
      </Field>
      <Field label={t("subject")}>
        <select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value as Subject })}>
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

function Documents({ lesson, onChange }: { lesson: Lesson; onChange: () => void }) {
  const { t } = useI18n();
  const [type, setType] = useState<DocType>("course");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const { busy, error, run } = useSubmit();
  const isVideo = type === "video";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(() =>
      api.post(`/api/lessons/${lesson.id}/documents`, form({ type, title: title || t(type), file: isVideo ? null : file, url: isVideo ? url : null })),
    );
    if (ok) {
      setTitle("");
      setFile(null);
      setUrl("");
      (e.target as HTMLFormElement).reset();
      onChange();
    }
  };
  const remove = async (docId: number) => {
    if (!confirm(t("confirm_delete"))) return;
    await api.del(`/api/documents/${docId}`);
    onChange();
  };

  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">{t("documents")}</h2>
      {lesson.documents.length === 0 ? (
        <p className="mb-3 text-sm text-slate-400">{t("no_documents")}</p>
      ) : (
        <ul className="mb-3 space-y-3">
          {lesson.documents.map((d) =>
            d.type === "video" ? (
              <li key={d.id} className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="badge bg-lavender-soft flex-1 truncate font-semibold">{d.title}</span>
                  <button className="text-xs text-rose-600" onClick={() => remove(d.id)}>✕</button>
                </div>
                <VideoEmbed src={d.file_path} title={d.title} />
              </li>
            ) : (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <span className="badge bg-slate-100 text-slate-600">{t(d.type)}</span>
                <a href={d.file_path} target="_blank" rel="noreferrer" className="flex-1 truncate font-semibold text-ink hover:underline">{d.title}</a>
                <button className="text-xs text-rose-600" onClick={() => remove(d.id)}>✕</button>
              </li>
            ),
          )}
        </ul>
      )}
      <form onSubmit={submit} className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-xs font-medium text-slate-600">{t("add_document")}</p>
        <div className="flex gap-2">
          <select className="input w-auto" value={type} onChange={(e) => setType(e.target.value as DocType)}>
            {DOC_TYPES.map((d) => <option key={d} value={d}>{t(d)}</option>)}
          </select>
          <input className="input" placeholder={t("title")} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        {isVideo ? (
          <Field label={t("video_url")} hint={t("video_url_hint")}>
            <input
              className="input"
              dir="ltr"
              type="url"
              placeholder="https://www.youtube.com/watch?v=…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </Field>
        ) : (
          <Field label={t("file")}>
            <FileButton file={file} onChange={setFile} accept=".pdf,image/*" />
          </Field>
        )}
        <ErrorBox error={error} />
        <button className="btn" disabled={busy || (isVideo ? !url.trim() : !file)}>{t("add")}</button>
      </form>
    </section>
  );
}

function Attendance({ lessonId }: { lessonId: number }) {
  const { t } = useI18n();
  const rows = useLoad(() => api.get<AttendanceRow[]>(`/api/lessons/${lessonId}/attendance`), [lessonId]);
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);
  const { busy, error, run } = useSubmit();

  useEffect(() => {
    if (rows.data) setMarks(Object.fromEntries(rows.data.map((r) => [r.student_id, r.present ?? true])));
  }, [rows.data]);

  const save = async () => {
    setSaved(false);
    const items = Object.entries(marks).map(([student_id, present]) => ({ student_id: Number(student_id), present }));
    if (await run(() => api.put(`/api/lessons/${lessonId}/attendance`, items))) setSaved(true);
  };

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{t("attendance")}</h2>
        <button className="btn-light text-xs" onClick={() => setMarks(Object.fromEntries(Object.keys(marks).map((k) => [k, true])))}>
          {t("mark_all_present")}
        </button>
      </div>
      <Loader state={rows}>
        {(list) => (
          <>
            <ul className="mb-3 divide-y divide-slate-100">
              {list.map((r) => {
                const present = marks[r.student_id] ?? true;
                return (
                  <li key={r.student_id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="flex-1">{r.first_name} {r.last_name}</span>
                    <button
                      onClick={() => { setSaved(false); setMarks({ ...marks, [r.student_id]: !present }); }}
                      className={`badge px-3 py-1 ${present ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"}`}
                    >
                      {present ? `✓ ${t("present")}` : `✗ ${t("absent")}`}
                    </button>
                  </li>
                );
              })}
            </ul>
            <ErrorBox error={error} />
            <div className="flex items-center gap-3">
              <button className="btn" onClick={save} disabled={busy || list.length === 0}>{t("save_attendance")}</button>
              {saved && <span className="text-sm text-emerald-700">{t("saved")}</span>}
            </div>
          </>
        )}
      </Loader>
    </section>
  );
}
