import { api } from "../../api";
import FamilyDocuments from "../../components/FamilyDocuments";
import LessonCalendar from "../../components/LessonCalendar";
import { useI18n } from "../../i18n";
import type { Lesson } from "../../types";
import { Loader, PageTitle, SubjectBadge, useLoad } from "../../ui";
import { ChildPicker, useChildren } from "./ChildPicker";

export default function FamilyLessons() {
  const { t } = useI18n();
  const kids = useChildren();
  const level = kids.selected?.level;
  const lessons = useLoad(
    () => (level ? api.get<Lesson[]>(`/api/lessons?level=${level}`) : Promise.resolve([])),
    [level],
  );

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>{t("nav_courses")}</PageTitle>
        <ChildPicker {...kids} />
        <Loader state={lessons}>{(list) => <LessonCalendar lessons={list} renderLesson={(l) => <LessonCard l={l} />} />}</Loader>
      </div>

      <section>
        <h2 className="mb-2 font-semibold">{t("my_documents")}</h2>
        <FamilyDocuments child={kids.selected} />
      </section>
    </div>
  );
}

function LessonCard({ l }: { l: Lesson }) {
  const { t } = useI18n();
  return (
    <article className="rounded-xl p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span dir="ltr" className="font-mono">{l.slot}</span>
        <SubjectBadge subject={l.subject} />
      </div>
      <h3 className="mt-1 font-semibold">{l.title}</h3>
      {l.notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{l.notes}</p>}
      {l.documents.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {l.documents.map((d) => (
            <a key={d.id} href={d.file_path} target="_blank" rel="noreferrer" className="btn-light text-xs">
              {t(d.type)} · {d.title}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">{t("no_documents")}</p>
      )}
    </article>
  );
}
