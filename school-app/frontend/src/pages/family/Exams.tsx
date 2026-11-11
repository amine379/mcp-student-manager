import { useState, type FormEvent } from "react";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import { SUBJECTS, type Exam, type Student } from "../../types";
import { Collapsible, Empty, ErrorBox, Field, FileThumbs, Loader, PageTitle, SubjectBadge, todayISO, useLoad, useSubmit } from "../../ui";
import { ChildPicker, useChildren } from "./ChildPicker";

export default function FamilyExams() {
  const { t } = useI18n();
  const kids = useChildren();
  const exams = useLoad(() => api.get<Exam[]>("/api/exams"));
  const child = kids.selected;
  const today = todayISO();

  return (
    <div className="space-y-4">
      <PageTitle hint={t("exams_hint")}>{t("nav_exams")}</PageTitle>
      <ChildPicker {...kids} />
      {child && (
        <Collapsible label={t("new_exam")}>
          {(close) => <ExamForm child={child} onDone={() => { close(); exams.reload(); }} onCancel={close} />}
        </Collapsible>
      )}
      <Loader state={exams}>
        {(all) => {
          const mine = all.filter((e) => e.student_id === child?.id);
          const upcoming = mine.filter((e) => e.exam_date >= today);
          const past = mine.filter((e) => e.exam_date < today).reverse();
          return (
            <>
              {upcoming.length === 0 && past.length === 0 && <Empty />}
              <div className="space-y-3">
                {upcoming.map((e) => <ExamCard key={e.id} e={e} onChange={exams.reload} />)}
              </div>
              {past.length > 0 && (
                <>
                  <h2 className="pt-2 font-semibold text-slate-600">{t("past_exams")}</h2>
                  <div className="space-y-3">
                    {past.map((e) => <ExamCard key={e.id} e={e} onChange={exams.reload} />)}
                  </div>
                </>
              )}
            </>
          );
        }}
      </Loader>
    </div>
  );
}

function ExamForm({ child, onDone, onCancel }: { child: Student; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ subject: "math", exam_date: todayISO(), description: "" });
  const { busy, error, run } = useSubmit();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => api.post("/api/exams", { ...f, student_id: child.id, description: f.description || null }))) onDone();
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("new_exam")} — {child.first_name}</h3>
      <Field label={t("subject")}>
        <select className="input" value={f.subject} onChange={set("subject")}>
          {SUBJECTS.map((s) => <option key={s} value={s}>{t(s)}</option>)}
        </select>
      </Field>
      <Field label={t("exam_date")}><input type="date" className="input" value={f.exam_date} onChange={set("exam_date")} required /></Field>
      <div className="sm:col-span-2">
        <Field label={t("description")}><input className="input" value={f.description} onChange={set("description")} /></Field>
      </div>
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn" disabled={busy}>{t("save")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}

function ExamCard({ e, onChange }: { e: Exam; onChange: () => void }) {
  const { t, fmtDate } = useI18n();
  const [grade, setGrade] = useState(e.grade ?? "");
  const { busy, error, run } = useSubmit();

  const upload = (files: File[]) => run(() => api.post(`/api/exams/${e.id}/files`, form({ files }))).then(onChange);
  const saveGrade = () => run(() => api.patch(`/api/exams/${e.id}`, { grade: grade || null })).then(onChange);
  const remove = async () => {
    if (!confirm(t("confirm_delete"))) return;
    await api.del(`/api/exams/${e.id}`);
    onChange();
  };

  return (
    <article className="card space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{fmtDate(e.exam_date)}</span>
        <SubjectBadge subject={e.subject} />
        <button className="ms-auto text-xs text-rose-600" onClick={remove}>{t("delete")}</button>
      </div>
      {e.description && <p className="text-sm text-slate-600">{e.description}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">{t("grade")}</span>
        <input className="input w-24" dir="ltr" placeholder="15/20" value={grade} onChange={(ev) => setGrade(ev.target.value)} />
        {grade !== (e.grade ?? "") && <button className="btn-light" disabled={busy} onClick={saveGrade}>{t("save")}</button>}
      </div>
      <FileThumbs files={e.files} />
      <label className="btn-light cursor-pointer">
        {t("upload_copy")}
        <input type="file" accept="image/*,.pdf" multiple className="hidden"
          onChange={(ev) => ev.target.files?.length && upload(Array.from(ev.target.files))} />
      </label>
      <ErrorBox error={error} />
    </article>
  );
}
