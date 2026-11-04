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
      <PageTitle>{t("nav_students")}</PageTitle>

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
            <div className="card divide-y divide-slate-100 p-0">
              {list.map((s) => (
                <StudentRow key={s.id} s={s} parentName={parentName(s.parent_id)} onChange={reloadAll} />
              ))}
            </div>
          )}
        </Loader>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{t("parents")}</h2>
        <Loader state={parents}>
          {(list) => list.length === 0 ? <Empty /> : (
            <div className="card divide-y divide-slate-100 p-0">
              {list.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">{p.full_name}</p>
                    <p className="text-xs text-slate-500" dir="ltr">@{p.username} {p.phone && `· ${p.phone}`}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.children.map((c) => (
                      <span key={c.id} className="badge bg-slate-100 text-slate-700">{c.first_name} · {c.level}</span>
                    ))}
                  </div>
                  <ResetPassword userId={p.id} />
                </div>
              ))}
            </div>
          )}
        </Loader>
      </section>
    </div>
  );
}

function StudentRow({ s, parentName, onChange }: { s: Student; parentName?: string; onChange: () => void }) {
  const { t } = useI18n();
  const toggle = () => api.patch(`/api/students/${s.id}`, { is_active: !s.is_active }).then(onChange);
  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-3 text-sm ${s.is_active ? "" : "opacity-50"}`}>
      <LevelBadge level={s.level} />
      <div className="min-w-40 flex-1">
        <p className="font-medium">{s.first_name} {s.last_name} {!s.is_active && <span className="text-xs">({t("inactive")})</span>}</p>
        {parentName && <p className="text-xs text-slate-500">{t("parent")} : {parentName}</p>}
      </div>
      {s.user_id && <ResetPassword userId={s.user_id} />}
      <button className="btn-light" onClick={toggle}>{s.is_active ? t("deactivate") : t("reactivate")}</button>
    </div>
  );
}

function ResetPassword({ userId }: { userId: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [done, setDone] = useState(false);
  const { busy, error, run } = useSubmit();

  if (!open) return <button className="btn-light text-xs" onClick={() => setOpen(true)}>{t("reset_password")}</button>;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await run(() => api.post(`/api/users/${userId}/reset-password`, { new_password: pwd }))) {
      setDone(true);
      setPwd("");
    }
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <div className="w-48">
        <PasswordInput placeholder={t("reset_password")} minLength={6} value={pwd}
          onChange={(e) => setPwd(e.target.value)} required autoComplete="new-password" />
      </div>
      <button className="btn" disabled={busy}>{t("save")}</button>
      <button type="button" className="btn-light" onClick={() => setOpen(false)}>✕</button>
      {done && <span className="text-xs text-emerald-700">{t("saved")}</span>}
      <ErrorBox error={error} />
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
      <Field label={t("phone")}><input className="input" dir="ltr" value={f.phone} onChange={set("phone")} /></Field>
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
      <Field label={t("last_name")}><input className="input" value={f.last_name} onChange={set("last_name")} required /></Field>
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
