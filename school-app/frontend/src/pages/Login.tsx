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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="absolute end-4 top-4">
        <LangSwitch />
      </div>
      <img src="/icon.svg" alt="" className="mb-3 h-16 w-16" />
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("app_name")}</h1>
      <p className="mb-6 mt-1 max-w-xs text-center text-sm text-slate-500">{t("tagline")}</p>
      {/* method/action + autocomplete : le navigateur propose d'enregistrer le mot de passe */}
      <form onSubmit={submit} method="post" action="/login" className="card w-full max-w-sm space-y-4 p-5 shadow-lg">
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
