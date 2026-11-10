import { useEffect, useRef } from "react";

import { api } from "../../api";
import { useI18n } from "../../i18n";
import type { Message } from "../../types";
import { Empty, FileThumbs, Loader, PageTitle, useLoad } from "../../ui";

export default function FamilyMessages() {
  const { t, fmtDate } = useI18n();
  const list = useLoad(() => api.get<Message[]>("/api/messages"));
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || !list.data) return;
    const unread = list.data.filter((m) => !m.is_read);
    if (unread.length === 0) return;
    marked.current = true;
    Promise.all(unread.map((m) => api.put(`/api/messages/${m.id}/read`))).catch(() => {});
  }, [list.data]);

  return (
    <div className="space-y-4">
      <PageTitle>{t("nav_messages")}</PageTitle>
      <Loader state={list}>
        {(items) => items.length === 0 ? <Empty /> : (
          <div className="space-y-3">
            {items.map((m) => (
              <div key={m.id} className={`card text-sm ${m.is_read ? "" : "ring-2 ring-indigo-300"}`}>
                <p className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{m.sender_name}</span>
                  <span>· {fmtDate(m.created_at)}</span>
                  {!m.is_read && <span className="badge bg-indigo-100 text-indigo-700">{t("new_badge")}</span>}
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
