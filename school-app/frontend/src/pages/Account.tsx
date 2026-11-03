import { useState, type FormEvent } from "react";

import { api } from "../api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { ErrorBox, Field, PageTitle, useSubmit } from "../ui";

export default function Account() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [done, setDone] = useState(false);
  const { busy, error, run } = useSubmit();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    const ok = await run(() => api.put("/api/auth/password", { current_password: current, new_password: next }));
    if (ok) {
      setCurrent("");
      setNext("");
      setDone(true);
    }
  };

  return (
    <div className="max-w-md">
      <PageTitle>{t("nav_account")}</PageTitle>
      <div className="card mb-4 text-sm">
        <p className="font-semibold">{user?.full_name}</p>
        <p className="text-slate-500">
          {t("username")} : <span dir="ltr">{user?.username}</span>
        </p>
      </div>
      <form onSubmit={submit} className="card space-y-3">
        <h2 className="font-semibold">{t("change_password")}</h2>
        <input type="text" name="username" autoComplete="username" value={user?.username ?? ""} readOnly hidden />
        <Field label={t("current_password")}>
          <input className="input" type="password" autoComplete="current-password" value={current}
            onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label={t("new_password")}>
          <input className="input" type="password" autoComplete="new-password" minLength={6} value={next}
            onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <ErrorBox error={error} />
        {done && <p className="text-sm text-emerald-700">{t("saved")}</p>}
        <button className="btn" disabled={busy}>{t("save")}</button>
      </form>
    </div>
  );
}
