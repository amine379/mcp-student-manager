import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useI18n } from "./i18n";
import type { Level, SubStatus, Subject } from "./types";

export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [load]);

  useEffect(() => {
    setData(null);
    reload();
  }, [reload]);

  return { data, error, reload };
}

export function Loader<T>({ state, children }: { state: { data: T | null; error: unknown }; children: (d: T) => ReactNode }) {
  const { t } = useI18n();
  if (state.error) return <ErrorBox error={state.error} />;
  if (state.data === null) return <p className="py-8 text-center text-sm text-slate-500">{t("loading")}</p>;
  return <>{children(state.data)}</>;
}

export function ErrorBox({ error }: { error: unknown }) {
  const { err } = useI18n();
  if (!error) return null;
  return <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{err(error)}</p>;
}

export function Empty() {
  const { t } = useI18n();
  return <p className="py-6 text-center text-sm text-slate-400">{t("empty")}</p>;
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-xl font-bold text-slate-900">{children}</h1>
      {action}
    </div>
  );
}

const levelColors: Record<Level, string> = {
  "1AC": "bg-sky-100 text-sky-800",
  "2AC": "bg-amber-100 text-amber-800",
  "3AC": "bg-violet-100 text-violet-800",
};

export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge ${levelColors[level]}`}>{level}</span>;
}

const subjectColors: Record<Subject, string> = {
  math: "bg-indigo-50 text-indigo-700",
  physics: "bg-orange-50 text-orange-700",
  svt: "bg-emerald-50 text-emerald-700",
};

export function SubjectBadge({ subject }: { subject: Subject }) {
  const { t } = useI18n();
  return <span className={`badge ${subjectColors[subject]}`}>{t(subject)}</span>;
}

const statusColors: Record<SubStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  submitted: "bg-emerald-100 text-emerald-800",
  not_done: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: { status: SubStatus }) {
  const { t } = useI18n();
  return <span className={`badge ${statusColors[status]}`}>{t(status)}</span>;
}

export function isImage(path: string) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

export function FileThumbs({ files }: { files: string[] }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) =>
        isImage(f) ? (
          <a key={f} href={f} target="_blank" rel="noreferrer">
            <img src={f} alt={`${i + 1}`} loading="lazy" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
          </a>
        ) : (
          <a key={f} href={f} target="_blank" rel="noreferrer" className="btn-light">
            PDF {i + 1}
          </a>
        ),
      )}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/** Fenêtre popup : feuille en bas sur mobile, centrée sur grand écran. */
export function Modal({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl sm:max-w-lg sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-light h-9 px-3 text-xs">{t("close")}</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Mot de passe masqué, avec un bouton pour l'afficher. */
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} dir="ltr" className={`input pe-16 ${props.className ?? ""}`} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 end-0 px-3 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        {show ? t("hide") : t("show")}
      </button>
    </div>
  );
}

/** Formulaire repliable : bouton « Ajouter » qui ouvre une carte. */
export function Collapsible({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  return <div className="card w-full">{children(() => setOpen(false))}</div>;
}

export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run, setError };
}

/** Sélecteur d'onglets (segmented control), pleine largeur sur mobile. */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            value === o.value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
