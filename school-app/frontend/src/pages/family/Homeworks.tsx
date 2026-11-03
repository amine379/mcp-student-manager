import { useState } from "react";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import type { Homework, Student } from "../../types";
import { Empty, ErrorBox, FileThumbs, Loader, PageTitle, StatusBadge, SubjectBadge, todayISO, useLoad, useSubmit } from "../../ui";
import { ChildPicker, useChildren } from "./ChildPicker";

export default function FamilyHomeworks() {
  const { t } = useI18n();
  const kids = useChildren();
  const all = useLoad(() => api.get<Homework[]>("/api/homeworks"));
  const child = kids.selected;

  return (
    <div>
      <PageTitle>{t("nav_homeworks")}</PageTitle>
      <ChildPicker {...kids} />
      <Loader state={all}>
        {(list) => {
          const mine = child ? list.filter((h) => h.level === child.level) : [];
          return mine.length === 0 ? <Empty /> : (
            <div className="space-y-3">
              {mine.map((h) => <HomeworkCard key={h.id} h={h} child={child!} onChange={all.reload} />)}
            </div>
          );
        }}
      </Loader>
    </div>
  );
}

function HomeworkCard({ h, child, onChange }: { h: Homework; child: Student; onChange: () => void }) {
  const { t, fmtDate } = useI18n();
  const sub = h.my_submissions[String(child.id)] ?? null;
  const status = sub?.status ?? "pending";
  const closed = !!h.correction_published_at;
  const late = status === "pending" && h.due_date < todayISO();
  const [files, setFiles] = useState<File[]>([]);
  const { busy, error, run } = useSubmit();

  const send = async () => {
    const ok = await run(() => api.post(`/api/homeworks/${h.id}/submit`, form({ student_id: String(child.id), files })));
    if (ok) {
      setFiles([]);
      onChange();
    }
  };

  return (
    <article className={`card ${late ? "ring-2 ring-rose-200" : ""}`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <SubjectBadge subject={h.subject} />
        <span className={late ? "font-semibold text-rose-600" : "text-slate-500"}>
          {t("due_date")} {fmtDate(h.due_date)} {late && `· ${t("late")}`}
        </span>
        <span className="ms-auto"><StatusBadge status={status} /></span>
      </div>
      <h2 className="mt-1 font-semibold">{h.title}</h2>
      {h.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{h.description}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {h.statement_path && (
          <a href={h.statement_path} target="_blank" rel="noreferrer" className="btn-light">📄 {t("see_statement")}</a>
        )}
        {h.correction_path && (
          <a href={h.correction_path} target="_blank" rel="noreferrer" className="btn-light bg-emerald-50 text-emerald-800">
            ✅ {t("see_correction")}
          </a>
        )}
      </div>

      {sub && sub.files.length > 0 && (
        <div className="mt-3">
          {sub.submitted_at && <p className="mb-1 text-xs text-slate-500">{t("sent_on")} {fmtDate(sub.submitted_at)}</p>}
          <FileThumbs files={sub.files} />
        </div>
      )}

      {!closed && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <label className="btn-light cursor-pointer">
            📷 {sub?.files.length ? t("add_more") : t("take_photo")}
            <input
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </label>
          {files.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {files.map((f) => (
                <img key={f.name + f.size} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
              ))}
              <button className="btn" onClick={send} disabled={busy}>{busy ? t("loading") : `${t("send_photos")} (${files.length})`}</button>
            </div>
          )}
          <ErrorBox error={error} />
        </div>
      )}
    </article>
  );
}
