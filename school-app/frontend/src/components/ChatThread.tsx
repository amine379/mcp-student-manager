import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { api, form } from "../api";
import { useI18n } from "../i18n";
import type { Message } from "../types";
import { ErrorBox, Glyph, isImage, useSubmit } from "../ui";

/** Conversation façon WhatsApp entre l'utilisateur courant et une autre personne. */
export default function ChatThread({
  messages,
  meId,
  recipientId,
  onChange,
}: {
  messages: Message[];
  meId: number;
  recipientId?: number;
  onChange: () => void;
}) {
  const { t, fmtDate, lang } = useI18n();
  const endRef = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { busy, error, run } = useSubmit();

  const ordered = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const locale = lang === "ar" ? "ar-MA" : "fr-MA";
  const time = (iso: string) => new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [ordered.length]);

  // Marque comme lus les messages reçus dès qu'ils s'affichent
  useEffect(() => {
    const unread = messages.filter((m) => !m.is_read && m.recipient_id === meId);
    if (unread.length) Promise.all(unread.map((m) => api.put(`/api/messages/${m.id}/read`))).then(onChange).catch(() => {});
  }, [messages, meId, onChange]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!body.trim() && !file) return;
    const data = form({ recipient_id: recipientId != null ? String(recipientId) : null, body: body.trim(), file });
    if (await run(() => api.post("/api/messages", data))) {
      setBody("");
      setFile(null);
      onChange();
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
  };

  let lastDay = "";
  return (
    <div className="pb-36 md:pb-24">
      {ordered.length === 0 ? (
        <p className="mx-auto mt-6 max-w-xs rounded-3xl bg-neutral-50 px-5 py-6 text-center text-sm text-neutral-500">{t("no_messages_yet")}</p>
      ) : (
        <div className="space-y-2">
          {ordered.map((m) => {
            const mine = m.recipient_id !== meId;
            const day = m.created_at.slice(0, 10);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {showDay && (
                  <p className="my-3 text-center">
                    <span className="inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500 first-letter:uppercase">{fmtDate(m.created_at)}</span>
                  </p>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[82%] rounded-3xl px-4 py-2.5 text-sm ${
                      mine ? "rounded-ee-md bg-ink text-white" : "rounded-es-md bg-neutral-100 text-ink"
                    }`}
                  >
                    {m.attachment_path && <Attachment path={m.attachment_path} mine={mine} />}
                    {m.body && <p className="whitespace-pre-line break-words">{m.body}</p>}
                    <p className={`mt-1 text-end text-[10px] tabular-nums ${mine ? "text-white/60" : "text-neutral-400"}`}>
                      {time(m.created_at)}
                      {mine && <span className="ms-1">{m.is_read ? "✓✓" : "✓"}</span>}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div ref={endRef} />

      <form
        onSubmit={send}
        className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-10 border-t border-neutral-100 bg-white/95 px-3 py-2 backdrop-blur md:bottom-0"
      >
        <div className="mx-auto max-w-5xl space-y-2">
          <ErrorBox error={error} />
          {file && (
            <div className="flex items-center gap-2 rounded-2xl bg-mint-soft px-3 py-2 text-sm">
              <Glyph name="file" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button type="button" onClick={() => setFile(null)} className="px-1 text-neutral-500" aria-label={t("remove")}>✕</button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-neutral-100 text-ink hover:bg-neutral-200" aria-label={t("attach_file")} title={t("photo_or_pdf")}>
              <Glyph name="paperclip" />
              <input key={file ? "set" : "empty"} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
            <textarea
              rows={1}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
              onKeyDown={onKey}
              placeholder={t("write_message")}
              maxLength={2000}
              className="input max-h-32 min-h-11 resize-none rounded-3xl py-2.5"
            />
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:bg-black disabled:opacity-40"
              disabled={busy || (!body.trim() && !file)}
              aria-label={t("send")}
            >
              <Glyph name="send" className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Attachment({ path, mine }: { path: string; mine: boolean }) {
  if (isImage(path))
    return (
      <a href={path} target="_blank" rel="noreferrer" className="mb-1.5 block">
        <img src={path} alt="" loading="lazy" className="h-48 w-56 max-w-full rounded-2xl bg-white/20 object-cover" />
      </a>
    );
  return (
    <a
      href={path}
      target="_blank"
      rel="noreferrer"
      className={`mb-1.5 flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ${mine ? "bg-white/15" : "bg-white"}`}
    >
      <Glyph name="file" className="h-5 w-5 shrink-0" />
      PDF
    </a>
  );
}
