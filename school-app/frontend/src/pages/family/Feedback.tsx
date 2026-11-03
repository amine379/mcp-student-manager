import { useState, type FormEvent } from "react";

import { api } from "../../api";
import { useI18n } from "../../i18n";
import type { Feedback } from "../../types";
import { Empty, ErrorBox, Field, Loader, PageTitle, useLoad, useSubmit } from "../../ui";
import { useChildren } from "./ChildPicker";

export default function FamilyFeedback() {
  const { t, fmtDate } = useI18n();
  const kids = useChildren();
  const list = useLoad(() => api.get<Feedback[]>("/api/feedback"));
  const [message, setMessage] = useState("");
  const [studentId, setStudentId] = useState("");
  const { busy, error, run } = useSubmit();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { message, student_id: studentId ? Number(studentId) : null };
    if (await run(() => api.post("/api/feedback", body))) {
      setMessage("");
      list.reload();
    }
  };

  return (
    <div className="space-y-4">
      <PageTitle>{t("nav_feedback")}</PageTitle>
      <form onSubmit={submit} className="card space-y-3">
        {kids.list.length > 1 && (
          <Field label={t("about_child")}>
            <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">{t("general")}</option>
              {kids.list.map((c) => <option key={c.id} value={c.id}>{c.first_name}</option>)}
            </select>
          </Field>
        )}
        <Field label={t("your_message")}>
          <textarea className="input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={2000} />
        </Field>
        <ErrorBox error={error} />
        <button className="btn" disabled={busy}>{t("send")}</button>
      </form>

      <Loader state={list}>
        {(items) => items.length === 0 ? <Empty /> : (
          <div className="space-y-3">
            {items.map((f) => (
              <div key={f.id} className="card text-sm">
                <p className="mb-1 text-xs text-slate-500">
                  {fmtDate(f.created_at)} {f.student_name && `· ${f.student_name}`}
                </p>
                <p className="whitespace-pre-line">{f.message}</p>
                {f.reply && (
                  <p className="mt-3 rounded-xl bg-indigo-50 p-3">
                    <span className="text-xs text-indigo-700">{t("teacher_reply")} :</span><br />{f.reply}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Loader>
    </div>
  );
}
