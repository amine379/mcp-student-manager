import { useState, type FormEvent } from "react";

import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { LangSwitch } from "../Layout";
import { ErrorBox, Field, useSubmit } from "../ui";

export default function Login() {
  const { t } = useI18n();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run } = useSubmit();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    run(() => login(username, password));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-slate-50 px-4">
      <div className="absolute end-4 top-4">
        <LangSwitch />
      </div>
      <img src="/icon.svg" alt="" className="mb-3 h-16 w-16" />
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{t("app_name")}</h1>
      {/* method/action + autocomplete : le navigateur propose d'enregistrer le mot de passe */}
      <form onSubmit={submit} method="post" action="/login" className="card w-full max-w-sm space-y-4">
        <h2 className="font-semibold">{t("login")}</h2>
        <Field label={t("username")}>
          <input
            className="input"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Field>
        <Field label={t("password")}>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <ErrorBox error={error} />
        <button className="btn w-full" disabled={busy}>
          {t("sign_in")}
        </button>
        <p className="text-center text-xs text-slate-400">{t("remember_hint")}</p>
      </form>
    </div>
  );
}
