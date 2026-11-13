import { useMemo, useState } from "react";

import { api, form } from "../../api";
import { useI18n } from "../../i18n";
import {
  CONTROL_NUMBERS, SEMESTERS, SUBJECTS,
  type ControlNumber, type ExamPrep, type Semester, type Subject,
} from "../../types";
import { Empty, ErrorBox, FileThumbs, Glyph, Loader, PageTitle, VideoEmbed, useLoad, useSubmit } from "../../ui";
import { ChildPicker, useChildren } from "./ChildPicker";

interface Folder {
  semester: Semester;
  control_number: ControlNumber;
}

export default function FamilyExamPrep() {
  const { t } = useI18n();
  const kids = useChildren();
  const [subject, setSubject] = useState<Subject>("math");
  const [folder, setFolder] = useState<Folder | null>(null);
  const child = kids.selected;
  const list = useLoad(
    () => (child ? api.get<ExamPrep[]>(`/api/exam-preps?level=${child.level}&subject=${subject}`) : Promise.resolve([])),
    [child?.level, subject],
  );

  return (
    <div className="space-y-4">
      <PageTitle hint={t("hint_exam_prep_family")}>{t("nav_exam_prep")}</PageTitle>
      <ChildPicker {...kids} />
      <div className="flex gap-2 overflow-x-auto">
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => { setSubject(s); setFolder(null); }}
            className={`btn-light shrink-0 ${s === subject ? "bg-ink text-white" : ""}`}
          >
            {t(s)}
          </button>
        ))}
      </div>

      {!child ? <Empty /> : (
        <Loader state={list}>
          {(items) =>
            folder ? (
              <FolderView
                childId={child.id}
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
      )}
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
                  onClick={() => count > 0 && onOpen({ semester: sem, control_number: n })}
                  disabled={count === 0}
                  className="card p-3 text-start disabled:opacity-40"
                >
                  <p className="font-semibold">{t("control_n").replace("{n}", String(n))}</p>
                  <p className="mt-1 text-xs text-neutral-500">{count > 0 ? `${count} ${t("exercises_count")}` : t("folder_empty")}</p>
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
  childId, folder, items, onBack, onChange,
}: {
  childId: number; folder: Folder; items: ExamPrep[]; onBack: () => void; onChange: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={onBack} className="text-sm font-semibold text-ink">{t("back_to_folders")}</button>
        <h2 className="font-semibold">{t("control_n").replace("{n}", String(folder.control_number))} · {t(folder.semester)}</h2>
      </div>
      <div className="space-y-3">
        {items.map((e) => <ExerciseCard key={e.id} item={e} childId={childId} onChange={onChange} />)}
      </div>
    </div>
  );
}

function ExerciseCard({ item, childId, onChange }: { item: ExamPrep; childId: number; onChange: () => void }) {
  const { t, fmtDate } = useI18n();
  const sub = item.my_submissions[String(childId)] ?? null;
  const published = !!item.correction_published_at;
  const [files, setFiles] = useState<File[]>([]);
  const { busy, error, run } = useSubmit();

  const send = async () => {
    const ok = await run(() => api.post(`/api/exam-preps/${item.id}/submit`, form({ student_id: String(childId), files })));
    if (ok) {
      setFiles([]);
      onChange();
    }
  };

  return (
    <article className="card space-y-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug">{item.title}</h3>
          <p className="text-xs text-neutral-500">{fmtDate(item.created_at)}</p>
        </div>
        {sub?.grade ? (
          <span className="badge shrink-0 bg-mint">{sub.grade}</span>
        ) : (
          <span className="badge shrink-0 bg-neutral-100">{t("no_grade_yet")}</span>
        )}
      </div>

      {item.statement_path && (
        <a href={item.statement_path} target="_blank" rel="noreferrer" className="btn-light">
          <Glyph name="file" className="h-4 w-4" /> {t("see_statement")}
        </a>
      )}

      {sub && sub.files.length > 0 && (
        <div className="rounded-2xl bg-mint-soft p-3">
          {sub.submitted_at && <p className="mb-2 text-xs font-semibold">✓ {t("sent_on")} {fmtDate(sub.submitted_at)}</p>}
          <FileThumbs files={sub.files} />
        </div>
      )}

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-300 px-4 py-4 text-sm font-semibold text-neutral-600 hover:border-ink hover:text-ink">
          <Glyph name="camera" />
          {sub?.files.length ? t("add_more") : t("send_my_photos")}
          <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
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

      {published && (
        <div className="space-y-2 border-t border-neutral-100 pt-3">
          {item.correction_path && (
            <a href={item.correction_path} target="_blank" rel="noreferrer" className="btn-light bg-mint">
              <Glyph name="file" className="h-4 w-4" /> {t("see_correction")}
            </a>
          )}
          {item.video_url && <VideoEmbed src={item.video_url} title={item.title} />}
        </div>
      )}
    </article>
  );
}
