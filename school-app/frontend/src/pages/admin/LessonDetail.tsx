import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import { DOC_TYPES, type AttendanceRow, type DocType, type Lesson, type Parent } from "../../types";
import { ErrorBox, Field, FileButton, LevelBadge, Loader, SubjectBadge, useLoad, useSubmit, WhatsAppButton } from "../../ui";

/** Boutons WhatsApp pour prévenir les parents du niveau qu'un contenu a été publié. */
function NotifyParents({ lesson, parents }: { lesson: Lesson; parents: Parent[] }) {
  const { t, fmtDate } = useI18n();
  const recipients = parents.filter((p) => p.children.some((c) => c.level === lesson.level));

  const message = (name: string) =>
    t("wa_lesson_text")
      .replace("{name}", name)
      .replace("{subject}", t(lesson.subject))
      .replace("{title}", lesson.title)
      .replace("{date}", fmtDate(lesson.date));

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
          <div className="card">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={l.level} />
              <SubjectBadge subject={l.subject} />
              <span className="text-sm text-slate-500">{fmtDate(l.date)} · <span dir="ltr">{l.slot}</span></span>
              <button className="btn-danger ms-auto" onClick={remove}>{t("delete")}</button>
            </div>
            <h1 className="mt-2 text-xl font-bold">{l.title}</h1>
            {l.notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{l.notes}</p>}
          </div>

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

function Documents({ lesson, onChange }: { lesson: Lesson; onChange: () => void }) {
  const { t } = useI18n();
  const [type, setType] = useState<DocType>("course");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { busy, error, run } = useSubmit();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(() =>
      api.post(`/api/lessons/${lesson.id}/documents`, form({ type, title: title || t(type), file })),
    );
    if (ok) {
      setTitle("");
      setFile(null);
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
        <ul className="mb-3 space-y-2">
          {lesson.documents.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-sm">
              <span className="badge bg-slate-100 text-slate-600">{t(d.type)}</span>
              <a href={d.file_path} target="_blank" rel="noreferrer" className="flex-1 truncate font-semibold text-ink hover:underline">{d.title}</a>
              <button className="text-xs text-rose-600" onClick={() => remove(d.id)}>✕</button>
            </li>
          ))}
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
        <Field label={t("file")}>
          <FileButton file={file} onChange={setFile} accept=".pdf,image/*" />
        </Field>
        <ErrorBox error={error} />
        <button className="btn" disabled={busy || !file}>{t("add")}</button>
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
