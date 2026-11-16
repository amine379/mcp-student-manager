import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../api";
import { useI18n } from "../../i18n";
import type { AbsenceNotification, ExamPrepNotification, HomeworkNotification, NotificationCase } from "../../types";
import { Empty, LevelBadge, Loader, PageTitle, SubjectBadge, useLoad, WhatsAppButton } from "../../ui";

const ENDPOINT: Record<NotificationCase, string> = {
  absence: "/api/notifications/absence",
  homework: "/api/notifications/homework",
  exam_prep: "/api/notifications/exam-prep",
};

const CASE_TITLE: Record<NotificationCase, string> = {
  absence: "case_absence",
  homework: "case_homework",
  exam_prep: "case_exam_prep",
};

type Row = AbsenceNotification | HomeworkNotification | ExamPrepNotification;

export default function AdminNotifications() {
  const { type } = useParams<{ type: NotificationCase }>();
  const { t, fmtDate } = useI18n();
  const caseType = type ?? "absence";
  const list = useLoad(() => api.get<Row[]>(ENDPOINT[caseType]), [caseType]);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const markSent = (row: Row) => {
    const key = `${row.reference_id}-${row.parent_id}`;
    setSent((s) => new Set(s).add(key));
    api.post("/api/notifications/mark-sent", { type: caseType, reference_id: row.reference_id, parent_id: row.parent_id })
      .catch(() => {});
  };

  const clearAll = () => {
    if (!confirm(t("confirm_clear_all"))) return;
    setSent((s) => new Set([...s, ...(list.data ?? []).map((r) => `${r.reference_id}-${r.parent_id}`)]));
    api.post(`/api/notifications/${caseType}/clear-all`).catch(() => {});
  };

  return (
    <div className="space-y-4">
      <Link to="/" className="text-sm font-semibold text-ink">{t("back_to_cases")}</Link>
      <PageTitle hint={t("mark_sent_hint")} action={<button className="btn-light text-xs" onClick={clearAll}>{t("clear_all")}</button>}>
        {t(CASE_TITLE[caseType])}
      </PageTitle>

      <Loader state={list}>
        {(rows) => {
          const pending = rows.filter((r) => !sent.has(`${r.reference_id}-${r.parent_id}`));
          return pending.length === 0 ? <Empty text={t("all_sent")} /> : (
            <ul className="space-y-2">
              {pending.map((row) => (
                <li key={`${row.reference_id}-${row.parent_id}`} className="card flex flex-wrap items-center gap-3">
                  <RowInfo caseType={caseType} row={row} />
                  <WhatsAppButton
                    phone={row.phone}
                    text={message(caseType, row, t, fmtDate)}
                    label={t("wa_send")}
                    onClick={() => markSent(row)}
                  />
                  <button
                    className="btn-light h-10 w-10 shrink-0 p-0 text-neutral-500"
                    aria-label={t("remove")}
                    onClick={() => markSent(row)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          );
        }}
      </Loader>
    </div>
  );
}

function RowInfo({ caseType, row }: { caseType: NotificationCase; row: Row }) {
  const { t, fmtDate } = useI18n();
  if (caseType === "absence") {
    const r = row as AbsenceNotification;
    return (
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{r.parent_name}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
          <LevelBadge level={r.level} /> <SubjectBadge subject={r.subject} />
          {r.student_name} · {t("absent")} · <span className="capitalize">{fmtDate(r.lesson_date)}</span>
        </p>
      </div>
    );
  }
  if (caseType === "homework") {
    const r = row as HomeworkNotification;
    return (
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{r.parent_name}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
          <LevelBadge level={r.level} /> <SubjectBadge subject={r.subject} />
          {r.title} · {t("due_date")} {fmtDate(r.due_date)}
          {r.correction_published && <span className="badge bg-mint">✓ {t("correction")}</span>}
        </p>
      </div>
    );
  }
  const r = row as ExamPrepNotification;
  return (
    <div className="min-w-0 flex-1">
      <p className="font-semibold">{r.parent_name}</p>
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
        <LevelBadge level={r.level} /> <SubjectBadge subject={r.subject} />
        {t("control_n").replace("{n}", String(r.control_number))} · {t(r.semester)} · {r.title}
      </p>
    </div>
  );
}

function message(
  caseType: NotificationCase, row: Row, t: (k: string) => string, fmtDate: (d: string) => string,
): string {
  if (caseType === "absence") {
    const r = row as AbsenceNotification;
    return t("wa_absence_text")
      .replace("{name}", r.parent_name)
      .replace("{student}", r.student_name)
      .replace("{subject}", t(r.subject))
      .replace("{date}", fmtDate(r.lesson_date));
  }
  if (caseType === "homework") {
    const r = row as HomeworkNotification;
    const key = r.correction_published ? "wa_correction_text" : "wa_homework_text";
    return t(key)
      .replace("{name}", r.parent_name)
      .replace("{subject}", t(r.subject))
      .replace("{title}", r.title)
      .replace("{date}", fmtDate(r.due_date));
  }
  const r = row as ExamPrepNotification;
  return t("wa_exam_prep_text")
    .replace("{name}", r.parent_name)
    .replace("{subject}", t(r.subject))
    .replace("{n}", String(r.control_number))
    .replace("{title}", r.title);
}
