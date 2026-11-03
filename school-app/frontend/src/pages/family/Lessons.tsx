import { api } from "../../api";
import { useI18n } from "../../i18n";
import type { Lesson } from "../../types";
import { Empty, Loader, PageTitle, SubjectBadge, useLoad } from "../../ui";
import { ChildPicker, useChildren } from "./ChildPicker";

const DOC_ICON = { course: "📘", exercise: "✏️", correction: "✅" } as const;

export default function FamilyLessons() {
  const { t, fmtDate } = useI18n();
  const kids = useChildren();
  const level = kids.selected?.level;
  const lessons = useLoad(
    () => (level ? api.get<Lesson[]>(`/api/lessons?level=${level}`) : Promise.resolve([])),
    [level],
  );

  return (
    <div>
      <PageTitle>{t("nav_courses")}</PageTitle>
      <ChildPicker {...kids} />
      <Loader state={lessons}>
        {(list) => list.length === 0 ? <Empty /> : (
          <div className="space-y-3">
            {list.map((l) => (
              <article key={l.id} className="card">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{fmtDate(l.date)}</span>
                  <SubjectBadge subject={l.subject} />
                </div>
                <h2 className="mt-1 font-semibold">{l.title}</h2>
                {l.notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{l.notes}</p>}
                {l.documents.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {l.documents.map((d) => (
                      <a key={d.id} href={d.file_path} target="_blank" rel="noreferrer" className="btn-light">
                        {DOC_ICON[d.type]} {d.title}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Loader>
    </div>
  );
}
