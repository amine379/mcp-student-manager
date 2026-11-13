import { useMemo, useState, type FormEvent } from "react";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import {
  CONTROL_NUMBERS, LEVELS, SEMESTERS, SUBJECTS,
  type ControlNumber, type ExamPrep, type ExamPrepSubmissionRow, type Level, type Semester, type Subject,
} from "../../types";
import {
  Collapsible, Empty, ErrorBox, Field, FileButton, FileThumbs, Loader, PageTitle, VideoEmbed, useLoad, useSubmit,
} from "../../ui";

interface Folder {
  semester: Semester;
  control_number: ControlNumber;
}

export default function AdminExamPrep() {
  const { t } = useI18n();
  const [level, setLevel] = useState<Level>("1AC");
  const [subject, setSubject] = useState<Subject>("math");
  const [folder, setFolder] = useState<Folder | null>(null);
  const list = useLoad(() => api.get<ExamPrep[]>(`/api/exam-preps?level=${level}&subject=${subject}`), [level, subject]);

  return (
    <div className="space-y-4">
      <PageTitle hint={t("hint_exam_prep_admin")}>{t("nav_exam_prep")}</PageTitle>
      <div className="flex gap-2">
        <select className="input w-auto" value={level} onChange={(e) => { setLevel(e.target.value as Level); setFolder(null); }}>
          {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
        </select>
        <select className="input w-auto" value={subject} onChange={(e) => { setSubject(e.target.value as Subject); setFolder(null); }}>
          {SUBJECTS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
      </div>

      <Loader state={list}>
        {(items) =>
          folder ? (
            <FolderView
              level={level}
              subject={subject}
              folder={folder}
              items={items.filter((e) => e.semester === folder.semester && e.control_number === folder.control_number)}
              onBack={() => setFolder(null)}
              onChange={list.reload}
            />
          ) : (
            <FolderGrid items={items} onOpen={setFolder} />
          )
        }
      </Loader>
    </div>
  );
}

function FolderGrid({ items, onOpen }: { items: ExamPrep[]; onOpen: (f: Folder) => void }) {
  const { t } = useI18n();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of items) m.set(`${e.semester}-${e.control_number}`, (m.get(`${e.semester}-${e.control_number}`) ?? 0) + 1);
    return m;
  }, [items]);

  return (
    <div className="space-y-4">
      {SEMESTERS.map((sem) => (
        <div key={sem}>
          <h2 className="mb-2 font-semibold">{t(sem)}</h2>
          <div className="grid grid-cols-3 gap-2">
            {CONTROL_NUMBERS.map((n) => {
              const count = counts.get(`${sem}-${n}`) ?? 0;
              return (
                <button
                  key={n}
                  onClick={() => onOpen({ semester: sem, control_number: n })}
                  className="card p-3 text-start active:scale-95"
                >
                  <p className="font-semibold">{t("control_n").replace("{n}", String(n))}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {count > 0 ? `${count} ${t("exercises_count")}` : t("create_first_exercise")}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FolderView({
  level, subject, folder, items, onBack, onChange,
}: {
  level: Level; subject: Subject; folder: Folder; items: ExamPrep[]; onBack: () => void; onChange: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="text-sm font-semibold text-ink">{t("back_to_folders")}</button>
        <h2 className="font-semibold">{t("control_n").replace("{n}", String(folder.control_number))} · {t(folder.semester)}</h2>
      </div>

      <Collapsible label={t("new_exercise")}>
        {(close) => (
          <ExerciseForm
            level={level} subject={subject} folder={folder} nextIndex={items.length + 1}
            onDone={() => { close(); onChange(); }} onCancel={close}
          />
        )}
      </Collapsible>

      {items.length === 0 ? <Empty text={t("folder_empty")} /> : (
        <div className="space-y-2">
          {items.map((e) => <ExerciseItem key={e.id} item={e} onChange={onChange} />)}
        </div>
      )}
    </div>
  );
}

function ExerciseForm({
  level, subject, folder, nextIndex, onDone, onCancel,
}: {
  level: Level; subject: Subject; folder: Folder; nextIndex: number; onDone: () => void; onCancel: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState<File | null>(null);
  const { busy, error, run } = useSubmit();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data = {
      level, subject, semester: folder.semester, control_number: String(folder.control_number),
      title: title.trim() || `${t("new_exercise").replace("+ ", "")} ${nextIndex}`,
      statement,
    };
    if (await run(() => api.post("/api/exam-preps", form(data)))) onDone();
  };

  return (
    <form onSubmit={submit} className="card space-y-2">
      <Field label={t("title")}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={`Exercice ${nextIndex}`} />
      </Field>
      <Field label={t("statement")}>
        <FileButton file={statement} onChange={setStatement} accept=".pdf,image/*" />
      </Field>
      <ErrorBox error={error} />
      <div className="flex gap-2">
        <button className="btn" disabled={busy}>{t("add")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}

function ExerciseItem({ item, onChange }: { item: ExamPrep; onChange: () => void }) {
  const { t, fmtDate } = useI18n();
  const [open, setOpen] = useState(false);
  const subs = useLoad(
    () => (open ? api.get<ExamPrepSubmissionRow[]>(`/api/exam-preps/${item.id}/submissions`) : Promise.resolve(null)),
    [open, item.id],
  );
  const [correction, setCorrection] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState(item.video_url ?? "");
  const { busy, error, run } = useSubmit();

  const publish = async () => {
    if (await run(() => api.post(`/api/exam-preps/${item.id}/correction`, form({ file: correction })))) {
      setCorrection(null);
      onChange();
    }
  };
  const saveVideo = () => run(() => api.patch(`/api/exam-preps/${item.id}`, { video_url: videoUrl.trim() || null })).then(onChange);
  const remove = async () => {
    if (!confirm(t("confirm_delete"))) return;
    await api.del(`/api/exam-preps/${item.id}`);
    onChange();
  };
  const grade = (studentId: number, value: string) =>
    api.put(`/api/exam-preps/${item.id}/submissions/${studentId}`, { grade: value || null }).then(() => subs.reload());

  return (
    <div className="card">
      <button className="flex w-full items-center gap-2 text-start" onClick={() => setOpen(!open)}>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{item.title}</span>
          <span className="text-xs text-neutral-500">{fmtDate(item.created_at)}</span>
        </span>
        {item.correction_published_at && <span className="badge bg-mint shrink-0">✓ {t("correction")}</span>}
        <span className={`shrink-0 text-neutral-400 transition ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-neutral-100 pt-3">
          {item.statement_path && (
            <a href={item.statement_path} target="_blank" rel="noreferrer" className="btn-light">{t("see_statement")}</a>
          )}

          <div className="space-y-2 rounded-2xl bg-neutral-50 p-3">
            <p className="text-xs font-semibold text-neutral-600">{t("correction")}</p>
            {item.correction_path && (
              <a href={item.correction_path} target="_blank" rel="noreferrer" className="btn-light bg-mint">{t("see_correction")}</a>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <FileButton file={correction} onChange={setCorrection} accept=".pdf,image/*" />
              <button className="btn-light" disabled={busy || !correction} onClick={publish}>{t("publish_correction")}</button>
            </div>
          </div>

          <div className="space-y-2 rounded-2xl bg-neutral-50 p-3">
            <Field label={t("video_url")} hint={t("video_url_hint")}>
              <div className="flex gap-2">
                <input className="input" dir="ltr" type="url" placeholder="https://www.youtube.com/watch?v=…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                <button type="button" className="btn-light shrink-0" disabled={busy} onClick={saveVideo}>{t("save")}</button>
              </div>
            </Field>
            {item.video_url && <VideoEmbed src={item.video_url} title={item.title} />}
          </div>

          <ErrorBox error={error} />

          <div>
            <p className="mb-2 text-xs font-semibold text-neutral-600">{t("nav_students")}</p>
            <Loader state={subs}>
              {(rows) =>
                !rows ? null : (
                  <ul className="divide-y divide-neutral-100">
                    {rows.map((r) => (
                      <li key={r.student_id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                        <span className="min-w-28 flex-1 font-medium">{r.first_name} {r.last_name}</span>
                        {r.files.length > 0 ? <FileThumbs files={r.files} /> : <span className="text-xs text-neutral-400">{t("not_submitted_yet")}</span>}
                        <GradeInput value={r.grade} onSave={(v) => grade(r.student_id, v)} />
                      </li>
                    ))}
                  </ul>
                )
              }
            </Loader>
          </div>

          <button className="text-xs text-rose-600" onClick={remove}>{t("delete")}</button>
        </div>
      )}
    </div>
  );
}

function GradeInput({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  const [v, setV] = useState(value ?? "");
  return (
    <input
      className="input w-20 shrink-0 text-center"
      dir="ltr"
      placeholder="15/20"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== (value ?? "") && onSave(v)}
    />
  );
}
