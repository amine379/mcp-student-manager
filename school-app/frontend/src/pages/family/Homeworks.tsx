import { useState } from "react";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import type { Homework, Student } from "../../types";
import { Empty, ErrorBox, FileThumbs, Glyph, Loader, PageTitle, StatusBadge, SubjectChip, todayISO, useLoad, useSubmit } from "../../ui";
import { ChildPicker, useChildren } from "./ChildPicker";

export default function FamilyHomeworks() {
  const { t } = useI18n();
  const kids = useChildren();
  const all = useLoad(() => api.get<Homework[]>("/api/homeworks"));
  const child = kids.selected;

  return (
    <div>
      <PageTitle hint={t("hint_homeworks_family")}>{t("nav_homeworks")}</PageTitle>
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
    <article className="card space-y-3">
      <div className="flex items-start gap-3">
        <SubjectChip subject={h.subject} size={44} />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold leading-snug">{h.title}</h2>
          <p className={`mt-0.5 flex items-center gap-1 text-xs ${late ? "font-semibold text-rose-700" : "text-neutral-500"}`}>
            <Glyph name="clock" className="h-3.5 w-3.5" />
            <span>{t("due_on")} {fmtDate(h.due_date)}</span>
          </p>
        </div>
        {late ? <span className="badge shrink-0 bg-rose-100 text-rose-800">{t("late")}</span> : <StatusBadge status={status} />}
      </div>

      {h.description && <p className="whitespace-pre-line rounded-2xl bg-neutral-50 p-3 text-sm text-neutral-700">{h.description}</p>}

      {(h.statement_path || h.correction_path) && (
        <div className="flex flex-wrap gap-2">
          {h.statement_path && (
            <a href={h.statement_path} target="_blank" rel="noreferrer" className="btn-light">
              <Glyph name="file" className="h-4 w-4" /> {t("see_statement")}
            </a>
          )}
          {h.correction_path && (
            <a href={h.correction_path} target="_blank" rel="noreferrer" className="btn-light bg-mint hover:bg-mint">
              <Glyph name="file" className="h-4 w-4" /> {t("see_correction")}
            </a>
          )}
        </div>
      )}

      {sub && sub.files.length > 0 && (
        <div className="rounded-2xl bg-mint-soft p-3">
          {sub.submitted_at && <p className="mb-2 text-xs font-semibold">✓ {t("sent_on")} {fmtDate(sub.submitted_at)}</p>}
          <FileThumbs files={sub.files} />
        </div>
      )}

      {!closed && (
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 px-4 py-4 text-sm font-semibold text-neutral-600 hover:border-ink hover:text-ink">
            <Glyph name="camera" />
            {sub?.files.length ? t("add_more") : t("take_photo")}
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
              {files.map((f) =>
                f.type.startsWith("image/") ? (
                  <img key={f.name + f.size} src={URL.createObjectURL(f)} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <span key={f.name + f.size} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lilac-soft text-xs font-bold">PDF</span>
                ),
              )}
              <button className="btn ms-auto" onClick={send} disabled={busy}>
                <Glyph name="send" className="h-4 w-4" />
                {busy ? t("loading") : `${t("send_photos")} (${files.length})`}
              </button>
            </div>
          )}
          <ErrorBox error={error} />
        </div>
      )}
    </article>
  );
}
