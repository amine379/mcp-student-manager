import { useEffect } from "react";

import { api } from "../../api";
import { useAuth } from "../../auth";
import ChatThread from "../../components/ChatThread";
import { useI18n } from "../../i18n";
import type { Message } from "../../types";
import { Loader, useLoad } from "../../ui";

export default function FamilyMessages() {
  const { t } = useI18n();
  const { user } = useAuth();
  const list = useLoad(() => api.get<Message[]>("/api/messages"));

  useEffect(() => {
    const id = setInterval(list.reload, 15_000);
    return () => clearInterval(id);
  }, [list.reload]);

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 rounded-3xl bg-lavender px-4 py-3">
        <img src="/icon.svg" alt="" className="h-11 w-11 rounded-2xl ring-2 ring-white" />
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight">{t("teacher")}</h1>
          <p className="text-xs text-ink/70">{t("hint_messages_family")}</p>
        </div>
      </div>
      <Loader state={list}>
        {(items) => user && <ChatThread messages={items} meId={user.id} onChange={list.reload} />}
      </Loader>
    </div>
  );
}
