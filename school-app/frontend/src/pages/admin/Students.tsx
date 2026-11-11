import { useState, type FormEvent } from "react";

import { api } from "../../api";
import { useI18n } from "../../i18n";
import { LEVELS, type Level, type Parent, type Student } from "../../types";
import { Collapsible, Empty, ErrorBox, Field, LevelBadge, Loader, PageTitle, PasswordInput, useLoad, useSubmit } from "../../ui";

export default function Students() {
  const { t } = useI18n();
  const [level, setLevel] = useState<Level | "">("");
  const parents = useLoad(() => api.get<Parent[]>("/api/parents"));
  const students = useLoad(
    () => api.get<Student[]>(`/api/students?include_inactive=true${level ? `&level=${level}` : ""}`),
    [level],
  );
  const reloadAll = () => {
    parents.reload();
    students.reload();
  };
  const parentName = (id: number | null) => parents.data?.find((p) => p.id === id)?.full_name;

  return (
    <div className="space-y-6">
      <PageTitle hint={t("hint_students")}>{t("nav_students")}</PageTitle>

      <div className="flex flex-wrap gap-2">
        <Collapsible label={t("new_parent")}>{(close) => <ParentForm onDone={() => { close(); reloadAll(); }} onCancel={close} />}</Collapsible>
        <Collapsible label={t("new_student")}>
          {(close) => <StudentForm parents={parents.data ?? []} onDone={() => { close(); reloadAll(); }} onCancel={close} />}
        </Collapsible>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t("nav_students")}</h2>
          <select className="input w-auto" value={level} onChange={(e) => setLevel(e.target.value as Level | "")}>
            <option value="">{t("all_levels")}</option>
            {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
          </select>
        </div>
        <Loader state={students}>
          {(list) => list.length === 0 ? <Empty /> : (
            <div className="card divide-y divide-neutral-100 overflow-hidden p-0">
              {list.map((s) => (
                <StudentRow key={s.id} s={s} parents={parents.data ?? []} parentName={parentName(s.parent_id)} onChange={reloadAll} />
              ))}
            </div>
          )}
        </Loader>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{t("parents")}</h2>
        <Loader state={parents}>
          {(list) => list.length === 0 ? <Empty /> : (
            <div className="card divide-y divide-neutral-100 overflow-hidden p-0">
              {list.map((p) => <ParentRow key={p.id} p={p} onChange={reloadAll} />)}
            </div>
          )}
        </Loader>
      </section>
    </div>
  );
}

function StudentRow({ s, parents, parentName, onChange }: { s: Student; parents: Parent[]; parentName?: string; onChange: () => void }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState(false);
  const toggle = () => api.patch(`/api/students/${s.id}`, { is_active: !s.is_active }).then(onChange);

  if (edit)
    return (
      <div className="space-y-3 px-4 py-4">
        <StudentEditForm s={s} parents={parents} onDone={() => { setEdit(false); onChange(); }} onCancel={() => setEdit(false)} />
        <button className={s.is_active ? "btn-danger" : "btn-light"} onClick={() => toggle().then(() => setEdit(false))}>
          {s.is_active ? t("deactivate") : t("reactivate")}
        </button>
      </div>
    );

  return (
    <div className={`flex items-center gap-3 px-4 py-3 text-sm ${s.is_active ? "" : "opacity-50"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${LEVEL_AVATAR[s.level]}`}>
        {s.first_name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          <span className="truncate">{s.first_name} {s.last_name}</span>
          <LevelBadge level={s.level} />
          {!s.is_active && <span className="badge bg-neutral-100">{t("inactive")}</span>}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {parentName && <>{t("parent")} : {parentName} · </>}
          {s.username ? <span dir="ltr">@{s.username}</span> : <span className="text-neutral-400">{t("no_login")}</span>}
        </p>
      </div>
      <button className="btn-light shrink-0 px-3 text-xs" onClick={() => setEdit(true)}>{t("edit")}</button>
    </div>
  );
}

const LEVEL_AVATAR: Record<Level, string> = { "1AC": "bg-lavender-soft", "2AC": "bg-sun-soft", "3AC": "bg-lilac-soft" };

function StudentEditForm({ s, parents, onDone, onCancel }: { s: Student; parents: Parent[]; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    first_name: s.first_name,
    last_name: s.last_name,
    level: s.level,
    parent_id: s.parent_id ? String(s.parent_id) : "",
    username: s.username ?? "",
    password: "",
  });
  const { busy, error, run } = useSubmit();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {
      first_name: f.first_name,
      last_name: f.last_name,
      level: f.level,
      parent_id: f.parent_id ? Number(f.parent_id) : null,
    };
    if (f.username.trim()) body.username = f.username.trim();
    if (f.password) body.password = f.password;
    if (await run(() => api.patch(`/api/students/${s.id}`, body))) onDone();
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("edit")} — {s.first_name}</h3>
      <Field label={t("first_name")}><input className="input" value={f.first_name} onChange={set("first_name")} required /></Field>
      <Field label={t("last_name")}><input className="input" value={f.last_name} onChange={set("last_name")} /></Field>
      <Field label={t("level")}>
        <select className="input" value={f.level} onChange={set("level")}>
          {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
        </select>
      </Field>
      <Field label={t("parent")}>
        <select className="input" value={f.parent_id} onChange={set("parent_id")}>
          <option value="">{t("no_parent")}</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </Field>
      <Field label={t("username")} hint={t("student_login_hint")}>
        <input className="input" dir="ltr" autoComplete="off" value={f.username} onChange={set("username")} minLength={3} />
      </Field>
      <Field label={t("new_password")} hint={t("keep_password_hint")}>
        <PasswordInput autoComplete="new-password" value={f.password} onChange={set("password")} minLength={6} />
      </Field>
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn" disabled={busy}>{t("save")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}

function ParentRow({ p, onChange }: { p: Parent; onChange: () => void }) {
  const { t } = useI18n();
  const [edit, setEdit] = useState(false);

  if (edit)
    return (
      <div className="px-4 py-3">
        <ParentEditForm p={p} onDone={() => { setEdit(false); onChange(); }} onCancel={() => setEdit(false)} />
      </div>
    );

  return (
    <div className="flex items-center gap-3 px-4 py-3 text-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-soft font-bold">
        {p.full_name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{p.full_name}</p>
        <p className="truncate text-xs text-neutral-500" dir="ltr">@{p.username}{p.phone && ` · ${p.phone}`}</p>
        {p.children.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {p.children.map((c) => (
              <span key={c.id} className="badge bg-neutral-100">{c.first_name} · {c.level}</span>
            ))}
          </div>
        )}
      </div>
      <button className="btn-light shrink-0 px-3 text-xs" onClick={() => setEdit(true)}>{t("edit")}</button>
    </div>
  );
}

function ParentEditForm({ p, onDone, onCancel }: { p: Parent; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ full_name: p.full_name, phone: p.phone ?? "", username: p.username, password: "" });
  const { busy, error, run } = useSubmit();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = { full_name: f.full_name, phone: f.phone || null };
    if (f.username.trim() && f.username.trim() !== p.username) body.username = f.username.trim();
    if (f.password) body.password = f.password;
    if (await run(() => api.patch(`/api/parents/${p.id}`, body))) onDone();
  };

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("edit")} — {p.full_name}</h3>
      <Field label={t("full_name")}><input className="input" value={f.full_name} onChange={set("full_name")} required /></Field>
      <Field label={t("phone")}><input className="input" dir="ltr" inputMode="tel" value={f.phone} onChange={set("phone")} /></Field>
      <Field label={t("username")}><input className="input" dir="ltr" autoComplete="off" value={f.username} onChange={set("username")} minLength={3} required /></Field>
      <Field label={t("new_password")} hint={t("keep_password_hint")}>
        <PasswordInput autoComplete="new-password" value={f.password} onChange={set("password")} minLength={6} />
      </Field>
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn" disabled={busy}>{t("save")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}

function ParentForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ full_name: "", phone: "", username: "", password: "" });
  const { busy, error, run } = useSubmit();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => api.post("/api/parents", { ...f, phone: f.phone || null }))) onDone();
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("new_parent")}</h3>
      <Field label={t("full_name")}><input className="input" value={f.full_name} onChange={set("full_name")} required /></Field>
      <Field label={t("phone")}><input className="input" dir="ltr" inputMode="tel" value={f.phone} onChange={set("phone")} /></Field>
      <Field label={t("username")}><input className="input" dir="ltr" autoComplete="off" value={f.username} onChange={set("username")} minLength={3} required /></Field>
      <Field label={t("password")}><PasswordInput autoComplete="new-password" value={f.password} onChange={set("password")} minLength={6} required /></Field>
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn" disabled={busy}>{t("save")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}

function StudentForm({ parents, onDone, onCancel }: { parents: Parent[]; onDone: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ first_name: "", last_name: "", level: "1AC", parent_id: "", username: "", password: "" });
  const { busy, error, run } = useSubmit();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      first_name: f.first_name,
      last_name: f.last_name,
      level: f.level,
      parent_id: f.parent_id ? Number(f.parent_id) : null,
      username: f.username || null,
      password: f.password || null,
    };
    if (await run(() => api.post("/api/students", body))) onDone();
  };
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{t("new_student")}</h3>
      <Field label={t("first_name")}><input className="input" value={f.first_name} onChange={set("first_name")} required /></Field>
      <Field label={t("last_name")}><input className="input" value={f.last_name} onChange={set("last_name")} /></Field>
      <Field label={t("level")}>
        <select className="input" value={f.level} onChange={set("level")}>
          {LEVELS.map((l) => <option key={l} value={l}>{t(l)}</option>)}
        </select>
      </Field>
      <Field label={t("parent")}>
        <select className="input" value={f.parent_id} onChange={set("parent_id")}>
          <option value="">{t("no_parent")}</option>
          {parents.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </Field>
      <p className="text-xs font-medium text-slate-600 sm:col-span-2">
        {t("student_login")} — <span className="font-normal text-slate-400">{t("student_login_hint")}</span>
      </p>
      <Field label={t("username")}><input className="input" dir="ltr" autoComplete="off" value={f.username} onChange={set("username")} minLength={3} /></Field>
      <Field label={t("password")}><PasswordInput autoComplete="new-password" value={f.password} onChange={set("password")} minLength={6} required={!!f.username} /></Field>
      <div className="sm:col-span-2"><ErrorBox error={error} /></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn" disabled={busy}>{t("save")}</button>
        <button type="button" className="btn-light" onClick={onCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}
