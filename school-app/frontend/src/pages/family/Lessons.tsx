import { api } from "../../api";
import LessonCalendar from "../../components/LessonCalendar";
import { useI18n } from "../../i18n";
import type { Lesson } from "../../types";
import { Loader, PageTitle, SubjectBadge, useLoad, VideoEmbed } from "../../ui";
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
    <div>
      <PageTitle hint={t("hint_lessons_family")}>{t("nav_courses")}</PageTitle>
      <ChildPicker {...kids} />
      <Loader state={lessons}>{(list) => <LessonCalendar lessons={list} renderLesson={(l) => <LessonCard l={l} />} />}</Loader>
    </div>
  );
}

function LessonCard({ l }: { l: Lesson }) {
  const { t } = useI18n();
  return (
    <article className="rounded-xl p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span dir="ltr" className="tabular-nums">{l.slot}</span>
        <SubjectBadge subject={l.subject} />
      </div>
      <h3 className="mt-1 font-semibold">{l.title}</h3>
      {l.notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{l.notes}</p>}
      {l.documents.length > 0 ? (
        <div className="mt-3 space-y-2">
          {l.documents
            .filter((d) => d.type !== "video")
            .map((d) => (
              <a key={d.id} href={d.file_path} target="_blank" rel="noreferrer" className="btn-light me-2 text-xs">
                {t(d.type)} · {d.title}
              </a>
            ))}
          {l.documents
            .filter((d) => d.type === "video")
            .map((d) => <VideoEmbed key={d.id} src={d.file_path} title={d.title} />)}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-400">{t("no_documents")}</p>
      )}
    </article>
  );
}
