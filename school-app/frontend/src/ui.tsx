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
            <img src={f} alt={`📷 ${i + 1}`} loading="lazy" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />
          </a>
        ) : (
          <a key={f} href={f} target="_blank" rel="noreferrer" className="btn-light">
            📄 {i + 1}
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

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
