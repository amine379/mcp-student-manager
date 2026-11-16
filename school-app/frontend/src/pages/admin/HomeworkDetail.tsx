import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import type { Homework, SubStatus, SubmissionRow } from "../../types";
import { ErrorBox, FileButton, FileThumbs, LevelBadge, Loader, StatusBadge, SubjectBadge, useLoad, useSubmit } from "../../ui";

const NEXT_STATUS: Record<SubStatus, SubStatus> = { pending: "submitted", submitted: "not_done", not_done: "pending" };

export default function AdminHomeworkDetail() {
  const { id } = useParams();
  const { t, fmtDate } = useI18n();
  const navigate = useNavigate();
  const hw = useLoad(() => api.get<Homework>(`/api/homeworks/${id}`), [id]);
  const subs = useLoad(() => api.get<SubmissionRow[]>(`/api/homeworks/${id}/submissions`), [id]);
  const [correction, setCorrection] = useState<File | null>(null);
  const { busy, error, run } = useSubmit();

  const cycle = async (row: SubmissionRow) => {
    await api.put(`/api/homeworks/${id}/submissions/${row.student_id}`, { status: NEXT_STATUS[row.status] });
    subs.reload();
  };
  const closeMissing = () => run(() => api.post(`/api/homeworks/${id}/close`)).then(subs.reload);
  const publish = async () => {
    if (await run(() => api.post(`/api/homeworks/${id}/correction`, form({ file: correction })))) {
      setCorrection(null);
      hw.reload();
    }
  };
  const remove = async () => {
    if (!confirm(t("confirm_delete"))) return;
    await api.del(`/api/homeworks/${id}`);
    navigate("/homeworks");
  };

  return (
    <Loader state={hw}>
      {(h) => (
        <div className="space-y-4">
          <Link to="/homeworks" className="text-sm font-semibold text-ink">← {t("back")}</Link>
          <div className="card">
            <div className="flex flex-wrap items-center gap-2">
              <LevelBadge level={h.level} />
              <SubjectBadge subject={h.subject} />
              <span className="text-sm text-slate-500">{t("due_date")} {fmtDate(h.due_date)}</span>
              <button className="btn-danger ms-auto" onClick={remove}>{t("delete")}</button>
            </div>
            <h1 className="mt-2 text-xl font-bold">{h.title}</h1>
            {h.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{h.description}</p>}
            {h.statement_path && (
              <a href={h.statement_path} target="_blank" rel="noreferrer" className="btn-light mt-3">{t("see_statement")}</a>
            )}
          </div>

          <section className="card">
            <h2 className="mb-2 font-semibold">{t("correction")}</h2>
            {h.correction_path ? (
              <p className="mb-3 text-sm">
                <span className="badge bg-mint">✓ {t("correction_published")}</span>{" "}
                <a href={h.correction_path} target="_blank" rel="noreferrer" className="font-semibold text-ink hover:underline">{t("see_correction")}</a>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <FileButton file={correction} onChange={setCorrection} accept=".pdf,image/*" />
              <button className="btn" disabled={busy || !correction} onClick={publish}>{t("publish_correction")}</button>
            </div>
          </section>

          <section className="card">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{t("submissions")}</h2>
              <button className="btn-light text-xs" disabled={busy} onClick={closeMissing}>{t("close_homework")}</button>
            </div>
            <ErrorBox error={error} />
            <Loader state={subs}>
              {(rows) => (
                <ul className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <li key={r.student_id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                      <span className="min-w-32 flex-1 font-medium">{r.first_name} {r.last_name}</span>
                      <FileThumbs files={r.files} />
                      {r.submitted_at && <span className="text-xs text-slate-400">{fmtDate(r.submitted_at)}</span>}
                      <button onClick={() => cycle(r)} title="↻"><StatusBadge status={r.status} /></button>
                    </li>
                  ))}
                </ul>
              )}
            </Loader>
          </section>
        </div>
      )}
    </Loader>
  );
}
