import { useState, type FormEvent } from "react";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import type { Message, Parent, Student } from "../../types";
import { Empty, ErrorBox, Field, FileThumbs, Loader, PageTitle, useLoad, useSubmit } from "../../ui";

export default function AdminMessages() {
  const { t, fmtDate } = useI18n();
  const parents = useLoad(() => api.get<Parent[]>("/api/parents"));
  const students = useLoad(() => api.get<Student[]>("/api/students"));
  const list = useLoad(() => api.get<Message[]>("/api/messages"));

  const [recipientId, setRecipientId] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { busy, error, run } = useSubmit();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const data = form({ recipient_id: recipientId, body, file });
    if (await run(() => api.post("/api/messages", data))) {
      setBody("");
      setFile(null);
      setRecipientId("");
      (e.target as HTMLFormElement).reset();
      list.reload();
    }
  };

  const studentsWithLogin = (students.data ?? []).filter((s) => s.user_id);

  return (
    <div className="space-y-4">
      <PageTitle>{t("nav_messages")}</PageTitle>

      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-semibold">{t("new_message")}</h2>
        <Field label={t("recipient")}>
          <select className="input" value={recipientId} onChange={(e) => setRecipientId(e.target.value)} required>
            <option value="" disabled>{t("select_recipient")}</option>
            {parents.data && parents.data.length > 0 && (
              <optgroup label={t("parents_group")}>
                {parents.data.map((p) => <option key={`p${p.id}`} value={p.id}>{p.full_name}</option>)}
              </optgroup>
            )}
            {studentsWithLogin.length > 0 && (
              <optgroup label={t("students_group")}>
                {studentsWithLogin.map((s) => (
                  <option key={`s${s.user_id}`} value={s.user_id!}>{s.first_name} {s.last_name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>
        <Field label={t("your_message")}>
          <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} required maxLength={2000} />
        </Field>
        <Field label={t("attachment")}>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
            className="input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <ErrorBox error={error} />
        <button className="btn" disabled={busy}>{t("send")}</button>
      </form>

      <h2 className="font-semibold">{t("sent_messages")}</h2>
      <Loader state={list}>
        {(items) => items.length === 0 ? <Empty /> : (
          <div className="space-y-3">
            {items.map((m) => (
              <div key={m.id} className="card text-sm">
                <p className="mb-1 text-xs text-slate-500">
                  {t("to_label")} <span className="font-semibold text-slate-800">{m.recipient_name}</span> · {fmtDate(m.created_at)}
                  {m.is_read && <span className="badge ms-2 bg-emerald-100 text-emerald-700">{t("mark_read")}</span>}
                </p>
                <p className="whitespace-pre-line">{m.body}</p>
                {m.attachment_path && <div className="mt-2"><FileThumbs files={[m.attachment_path]} /></div>}
              </div>
            ))}
          </div>
        )}
      </Loader>
    </div>
  );
}
