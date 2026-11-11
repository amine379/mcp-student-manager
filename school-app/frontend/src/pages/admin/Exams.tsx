import { useState } from "react";

import { api } from "../../api";
import { useI18n } from "../../i18n";
import { LEVELS, type Exam, type Level } from "../../types";
import { Empty, FileThumbs, LevelBadge, Loader, PageTitle, SubjectBadge, useLoad } from "../../ui";

export default function AdminExams() {
  const { t, fmtDate } = useI18n();
  const [level, setLevel] = useState<Level | "">("");
  const [upcoming, setUpcoming] = useState(true);
  const exams = useLoad(
    () => api.get<Exam[]>(`/api/exams?upcoming_only=${upcoming}${level ? `&level=${level}` : ""}`),
    [level, upcoming],
  );

  return (
    <div className="space-y-4">
      <PageTitle hint={t("hint_exams_admin")}>{t("nav_exams")}</PageTitle>
      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
          <option value="">{t("all_levels")}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
        </select>
        <button className={upcoming ? "btn" : "btn-light"} onClick={() => setUpcoming(true)}>{t("upcoming")}</button>
        <button className={!upcoming ? "btn" : "btn-light"} onClick={() => setUpcoming(false)}>{t("all")}</button>
      </div>
      <Loader state={exams}>
        {(list) => list.length === 0 ? <Empty /> : (
          <div className="card divide-y divide-slate-100 p-0">
            {list.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="w-28 shrink-0 text-xs font-medium text-slate-600">{fmtDate(e.exam_date)}</span>
                <LevelBadge level={e.student.level} />
                <span className="font-medium">{e.student.first_name} {e.student.last_name}</span>
                <SubjectBadge subject={e.subject} />
                <span className="flex-1 text-slate-500">{e.description}</span>
                {e.grade && <span className="badge bg-lavender-soft" dir="ltr">{e.grade}</span>}
                <FileThumbs files={e.files} />
              </div>
            ))}
          </div>
        )}
      </Loader>
    </div>
  );
}
