import { useState, type FormEvent } from "react";

import { api, form } from "../api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import type { FamilyDoc, Student } from "../types";
import { Empty, ErrorBox, Field, isImage, Loader, useLoad, useSubmit } from "../ui";

/** Documents partagés par les familles. Sans `child` : vue prof (tous les élèves, lecture). */
export default function FamilyDocuments({ child }: { child?: Student | null }) {
  const { t, fmtDate } = useI18n();
  const { user } = useAuth();
  const docs = useLoad(
    () => api.get<FamilyDoc[]>(`/api/family-documents${child ? `?student_id=${child.id}` : ""}`),
    [child?.id],
  );

  const remove = async (id: number) => {
    if (!confirm(t("confirm_delete"))) return;
    await api.del(`/api/family-documents/${id}`);
    docs.reload();
  };

  return (
    <div className="space-y-3">
      {child && <UploadForm child={child} onDone={docs.reload} />}
      <Loader state={docs}>
        {(list) => list.length === 0 ? <Empty /> : (
          <ul className="space-y-2">
            {list.map((d) => (
              <li key={d.id} className="card flex items-start gap-3 p-3">
                <a href={d.file_path} target="_blank" rel="noreferrer" className="shrink-0">
                  {isImage(d.file_path) ? (
                    <img src={d.file_path} alt={d.title} loading="lazy" className="h-14 w-14 rounded-lg object-cover ring-1 ring-slate-200" />
                  ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-rose-50 text-xs font-bold text-rose-700">PDF</span>
                  )}
                </a>
                <div className="min-w-0 flex-1">
                  <a href={d.file_path} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">
                    {d.title}
                  </a>
                  {d.note && <p className="text-sm text-slate-600">{d.note}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {!child && d.student_name && <span className="font-medium text-slate-600">{d.student_name} · </span>}
                    {t("added_by")} {d.uploaded_by_name} · {fmtDate(d.created_at)}
                  </p>
                </div>
                {(user?.role === "admin" || d.uploaded_by === user?.id) && (
                  <button onClick={() => remove(d.id)} className="p-1 text-sm text-rose-500" aria-label={t("delete")}>✕</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Loader>
    </div>
  );
}

function UploadForm({ child, onDone }: { child: Student; onDone: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { busy, error, run } = useSubmit();

  if (!open)
    return (
      <button className="btn w-full sm:w-auto" onClick={() => setOpen(true)}>
        + {t("add_family_doc")}
      </button>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(() =>
      api.post("/api/family-documents", form({ student_id: String(child.id), title, note: note || null, file })),
    );
    if (ok) {
      setTitle("");
      setNote("");
      setFile(null);
      setOpen(false);
      onDone();
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3">
      <div>
        <h3 className="font-semibold">{t("add_family_doc")} — {child.first_name}</h3>
        <p className="text-xs text-slate-500">{t("family_doc_hint")}</p>
      </div>
      <Field label={t("title")}>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
      </Field>
      <Field label={t("notes")}>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <label className="btn-light w-full cursor-pointer justify-center sm:w-auto">
        {file ? file.name : t("take_photo")}
        <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <ErrorBox error={error} />
      <div className="flex gap-2">
        <button className="btn flex-1 sm:flex-none" disabled={busy || !file}>{t("send")}</button>
        <button type="button" className="btn-light" onClick={() => setOpen(false)}>{t("cancel")}</button>
      </div>
    </form>
  );
}
