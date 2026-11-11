import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../api";
import { useAuth } from "../../auth";
import ChatThread from "../../components/ChatThread";
import { useI18n } from "../../i18n";
import type { Message, Parent, Student } from "../../types";
import { Glyph, Loader, PageTitle, useLoad } from "../../ui";

interface Contact {
  id: number;
  name: string;
  kind: "parent" | "student";
  sub: string;
}

export default function AdminMessages() {
  const { id } = useParams();
  const { user } = useAuth();
  const parents = useLoad(() => api.get<Parent[]>("/api/parents"));
  const students = useLoad(() => api.get<Student[]>("/api/students"));
  const list = useLoad(() => api.get<Message[]>("/api/messages"));

  useEffect(() => {
    const timer = setInterval(list.reload, 15_000);
    return () => clearInterval(timer);
  }, [list.reload]);

  const contacts = useMemo<Contact[]>(() => {
    const ps: Contact[] = (parents.data ?? []).map((p) => ({
      id: p.id,
      name: p.full_name,
      kind: "parent",
      sub: p.children.map((c) => c.first_name).join(", "),
    }));
    const ss: Contact[] = (students.data ?? [])
      .filter((s) => s.user_id)
      .map((s) => ({ id: s.user_id!, name: `${s.first_name} ${s.last_name}`, kind: "student", sub: s.level }));
    return [...ps, ...ss];
  }, [parents.data, students.data]);

  if (!user) return null;
  const otherId = id ? Number(id) : null;

  return (
    <Loader state={list}>
      {(messages) =>
        otherId == null ? (
          <ContactList contacts={contacts} messages={messages} meId={user.id} />
        ) : (
          <Conversation
            contact={contacts.find((c) => c.id === otherId)}
            messages={messages.filter((m) => m.recipient_id === otherId || m.sender_id === otherId)}
            meId={user.id}
            otherId={otherId}
            onChange={list.reload}
          />
        )
      }
    </Loader>
  );
}

function ContactList({ contacts, messages, meId }: { contacts: Contact[]; messages: Message[]; meId: number }) {
  const { t, fmtDate } = useI18n();
  const [q, setQ] = useState("");

  const rows = contacts
    .map((c) => {
      const thread = messages.filter((m) => m.recipient_id === c.id || m.sender_id === c.id);
      const last = thread[0]; // l'API renvoie du plus récent au plus ancien
      const unread = thread.filter((m) => m.recipient_id === meId && !m.is_read).length;
      return { c, last, unread };
    })
    .filter(({ c }) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));

  return (
    <div>
      <PageTitle hint={t("hint_messages_admin")}>{t("nav_messages")}</PageTitle>
      <label className="relative mb-4 block">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-neutral-400">
          <Glyph name="search" className="h-4 w-4" />
        </span>
        <input className="input ps-9" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <ul className="divide-y divide-neutral-100 overflow-hidden rounded-3xl border border-ink bg-white">
        {rows.map(({ c, last, unread }) => (
          <li key={c.id}>
            <Link to={`/messages/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                  c.kind === "parent" ? "bg-lilac-soft" : "bg-lavender-soft"
                }`}
              >
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className={`truncate ${unread ? "font-bold" : "font-semibold"}`}>{c.name}</span>
                  <span className="shrink-0 text-[11px] text-neutral-400">
                    {c.kind === "parent" ? t("parent_label") : t("student_label")} · {c.sub}
                  </span>
                </span>
                <span className={`block truncate text-sm ${unread ? "font-semibold text-ink" : "text-neutral-500"}`}>
                  {last ? (last.recipient_id === c.id ? `${t("you")} : ` : "") + (last.body || t("photo_or_pdf")) : t("no_messages_yet")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {last && <span className="inline-block text-[11px] text-neutral-400 first-letter:uppercase">{fmtDate(last.created_at)}</span>}
                {unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-mint px-1.5 text-[11px] font-bold">{unread}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Conversation({
  contact,
  messages,
  meId,
  otherId,
  onChange,
}: {
  contact: Contact | undefined;
  messages: Message[];
  meId: number;
  otherId: number;
  onChange: () => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="mb-3 flex items-center gap-3 rounded-3xl bg-lavender px-3 py-3">
        <Link to="/messages" className="flex h-10 w-10 items-center justify-center rounded-full bg-white" aria-label={t("back")}>
          <Glyph name="back" />
        </Link>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-base font-bold">
          {contact?.name.charAt(0).toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight">{contact?.name ?? "…"}</h1>
          {contact && (
            <p className="text-xs text-ink/70">
              {contact.kind === "parent" ? t("parent_label") : t("student_label")} · {contact.sub}
            </p>
          )}
        </div>
      </div>
      <ChatThread messages={messages} meId={meId} recipientId={otherId} onChange={onChange} />
    </div>
  );
}
