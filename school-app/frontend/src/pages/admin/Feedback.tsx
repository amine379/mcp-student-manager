import { useState, type FormEvent } from "react";

import { api } from "../../api";
import { useI18n } from "../../i18n";
import type { Feedback } from "../../types";
import { Empty, ErrorBox, Loader, PageTitle, useLoad, useSubmit } from "../../ui";

export default function AdminFeedback() {
  const { t } = useI18n();
  const list = useLoad(() => api.get<Feedback[]>("/api/feedback"));

  return (
    <div className="space-y-4">
      <PageTitle>{t("nav_feedback")}</PageTitle>
      <Loader state={list}>
        {(items) => items.length === 0 ? <Empty /> : (
          <div className="space-y-3">
            {items.map((f) => <FeedbackCard key={f.id} f={f} onChange={list.reload} />)}
          </div>
        )}
      </Loader>
    </div>
  );
}

function FeedbackCard({ f, onChange }: { f: Feedback; onChange: () => void }) {
  const { t, fmtDate } = useI18n();
  const [reply, setReply] = useState("");
  const { busy, error, run } = useSubmit();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => api.put(`/api/feedback/${f.id}/reply`, { reply }))) onChange();
  };

  return (
    <div className={`card ${f.is_read ? "" : "ring-2 ring-indigo-300"}`}>
      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-800">{f.author}</span>
        {f.student_name && <span>· {t("about_child")} {f.student_name}</span>}
        <span>· {fmtDate(f.created_at)}</span>
        {!f.is_read && <span className="badge bg-indigo-100 text-indigo-700">{t("new_badge")}</span>}
      </div>
      <p className="whitespace-pre-line text-sm">{f.message}</p>
      {f.reply ? (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><span className="text-xs text-slate-500">{t("teacher_reply")} :</span><br />{f.reply}</p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input className="input" placeholder={t("reply")} value={reply} onChange={(e) => setReply(e.target.value)} required />
          <button className="btn" disabled={busy}>{t("send")}</button>
          {!f.is_read && (
            <button type="button" className="btn-light" onClick={() => api.put(`/api/feedback/${f.id}/read`).then(onChange)}>✓</button>
          )}
        </form>
      )}
      <ErrorBox error={error} />
    </div>
  );
}
