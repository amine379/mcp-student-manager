import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import { LEVELS, SUBJECTS, type Homework, type Level } from "../../types";
import { Collapsible, Empty, ErrorBox, Field, LevelBadge, Loader, PageTitle, SubjectBadge, todayISO, useLoad, useSubmit } from "../../ui";

export default function AdminHomeworks() {
  const { t, fmtDate } = useI18n();
  const [level, setLevel] = useState<Level | "">("");
  const list = useLoad(() => api.get<Homework[]>(`/api/homeworks${level ? `?level=${level}` : ""}`), [level]);

  return (
    <div className="space-y-4">
      <PageTitle>{t("nav_homeworks")}</PageTitle>
      <Collapsible label={t("new_homework")}>
        {(close) => <HomeworkForm onDone={() => { close(); list.reload(); }} onCancel={close} />}
      </Collapsible>

      <select className="input w-auto" value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
        <option value="">{t("all_levels")}</option>
        {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
      </select>

      <Loader state={list}>
        {(items) => items.length === 0 ? <Empty /> : (
          <div className="card divide-y divide-slate-100 p-0">
            {items.map((h) => (
              <Link key={h.id} to={`/homeworks/${h.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
                <LevelBadge level={h.level} />
                <SubjectBadge subject={h.subject} />
                <span className="flex-1 font-medium">{h.title}</span>
                <span className="text-xs text-slate-500">{t("due_date")} {fmtDate(h.due_date)}</span>
                {h.correction_published_at && <span className="badge bg-emerald-100 text-emerald-800">✓ {t("correction")}</span>}
              </Link>
            ))}
          </div>
        )}
      </Loader>
    </div>
  );
}

function HomeworkForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ level: "1AC", subject: "math", title: "", description: "", due_date: todayISO() });
  const [statement, setStatement] = useState<File | null>(null);
  const { busy, error, run } = useSubmit();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => api.post("/api/homeworks", form({ ...f, description: f.description || null, statement })))) onDone();
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("new_homework")}</h3>
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
      <Field label={t("title")}><input className="input" value={f.title} onChange={set("title")} required /></Field>
      <Field label={t("due_date")}><input type="date" className="input" value={f.due_date} onChange={set("due_date")} required /></Field>
      <div className="sm:col-span-2">
        <Field label={t("description")}><textarea className="input" rows={2} value={f.description} onChange={set("description")} /></Field>
      </div>
      <div className="sm:col-span-2">
        <Field label={t("statement")}>
          <input type="file" accept=".pdf,image/*" className="text-sm" onChange={(e) => setStatement(e.target.files?.[0] ?? null)} />
        </Field>
      </div>
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn" disabled={busy}>{t("save")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}
