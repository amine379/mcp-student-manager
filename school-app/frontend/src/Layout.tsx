import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { api } from "./api";
import { useAuth } from "./auth";
import { useI18n, type Lang } from "./i18n";

// Icônes au trait (style Lucide), 24×24
const ICONS = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M10 21v-6h4v6",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7",
  book: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5",
  pen: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  message: "M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12",
  mail: "M4 5h16v14H4zM4 6l8 7 8-7",
} as const;

type IconName = keyof typeof ICONS;

function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

const ADMIN_NAV: [string, string, IconName][] = [
  ["/", "nav_home", "home"],
  ["/students", "nav_students", "users"],
  ["/lessons", "nav_lessons", "book"],
  ["/homeworks", "nav_homeworks", "pen"],
  ["/exams", "nav_exams", "calendar"],
  ["/messages", "nav_messages", "mail"],
  ["/feedback", "nav_feedback", "message"],
];

const FAMILY_NAV: [string, string, IconName][] = [
  ["/", "nav_home", "home"],
  ["/lessons", "nav_courses", "book"],
  ["/homeworks", "nav_homeworks", "pen"],
  ["/exams", "nav_exams", "calendar"],
  ["/messages", "nav_messages", "mail"],
  ["/feedback", "nav_feedback", "message"],
];

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  const { user } = useAuth();
  const next: Lang = lang === "fr" ? "ar" : "fr";
  const toggle = () => {
    setLang(next);
    if (user) api.put("/api/auth/language", { language: next }).catch(() => {});
  };
  return (
    <button onClick={toggle} className="btn-light h-10 px-3" lang={next} aria-label={next === "ar" ? "العربية" : "Français"}>
      <span className="sm:hidden">{next === "ar" ? "ع" : "FR"}</span>
      <span className="hidden sm:inline">{next === "ar" ? "العربية" : "Français"}</span>
    </button>
  );
}

export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-2">
      <img src="/icon.svg" alt="" className={size === "lg" ? "h-14 w-14" : "h-9 w-9"} />
      <span className={`font-extrabold tracking-tight text-slate-900 ${size === "lg" ? "text-2xl" : "text-base"}`}>
        {t("app_name")}
      </span>
    </span>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const nav = user?.role === "admin" ? ADMIN_NAV : FAMILY_NAV;

  // Accolades obligatoires : Chrome récent renvoie une Promise, que React prendrait pour un cleanup
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
          <NavLink to="/"><Brand /></NavLink>
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
          <div className="ms-auto flex items-center gap-1.5">
            <LangSwitch />
            <NavLink
              to="/account"
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-100 pe-3 ps-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
              aria-label={t("nav_account")}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                {user?.full_name.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-32 truncate sm:inline">{user?.full_name}</span>
            </NavLink>
            <button onClick={logout} className="btn-light h-10 w-10 p-0" aria-label={t("logout")} title={t("logout")}>
              <svg viewBox="0 0 24 24" className="h-5 w-5 rtl:-scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
        <Outlet />
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map(([to, key, icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 pb-1.5 pt-2 ${isActive ? "font-semibold text-indigo-700" : "text-slate-500"}`
            }
          >
            <Icon name={icon} />
            <span className="w-full truncate px-0.5 text-center text-[10.5px]">{t(key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
