import { NavLink, Outlet } from "react-router-dom";

import { api } from "./api";
import { useAuth } from "./auth";
import { useI18n, type Lang } from "./i18n";

const ADMIN_NAV = [
  ["/", "nav_home", "🏠"],
  ["/students", "nav_students", "👨‍👩‍👧"],
  ["/lessons", "nav_lessons", "📚"],
  ["/homeworks", "nav_homeworks", "📝"],
  ["/exams", "nav_exams", "📅"],
  ["/feedback", "nav_feedback", "💬"],
] as const;

const FAMILY_NAV = [
  ["/", "nav_home", "🏠"],
  ["/lessons", "nav_courses", "📚"],
  ["/homeworks", "nav_homeworks", "📝"],
  ["/exams", "nav_exams", "📅"],
  ["/feedback", "nav_feedback", "💬"],
] as const;

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();
  const next: Lang = lang === "fr" ? "ar" : "fr";
  const toggle = () => {
    setLang(next);
    if (user) api.put("/api/auth/language", { language: next }).catch(() => {});
  };
  return (
    <button onClick={toggle} className="btn-light px-2.5 py-1.5" lang={next}>
      {next === "ar" ? "العربية" : "Français"}
    </button>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const nav = user?.role === "admin" ? ADMIN_NAV : FAMILY_NAV;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <span className="font-bold text-slate-900">{t("app_name")}</span>
          <nav className="ms-6 hidden gap-1 md:flex">
            {nav.map(([to, key]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`
                }
              >
                {t(key)}
              </NavLink>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <LangSwitch />
            <NavLink to="/account" className="btn-light px-2.5 py-1.5" title={t("nav_account")}>
              👤 <span className="hidden sm:inline">{user?.full_name}</span>
            </NavLink>
            <button onClick={logout} className="btn-light px-2.5 py-1.5" title={t("logout")}>
              ⎋
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid border-t border-slate-200 bg-white md:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map(([to, key, icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? "font-semibold text-indigo-700" : "text-slate-500"}`
            }
          >
            <span className="text-lg leading-none">{icon}</span>
            {t(key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
