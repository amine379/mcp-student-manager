import { useEffect, useRef, useState } from "react";
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
  mail: "M4 5h16v14H4zM4 6l8 7 8-7",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  target: "M9 11l2 2 4-4M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z",
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
  ["/exam-prep", "nav_exam_prep", "target"],
  ["/messages", "nav_messages", "mail"],
];

const FAMILY_NAV: [string, string, IconName][] = [
  ["/", "nav_home", "home"],
  ["/lessons", "nav_courses", "book"],
  ["/homeworks", "nav_homeworks", "pen"],
  ["/exams", "nav_exams", "calendar"],
  ["/exam-prep", "nav_exam_prep", "target"],
  ["/documents", "nav_documents", "folder"],
  ["/messages", "nav_messages", "mail"],
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
  const bottomNavRef = useRef<HTMLElement>(null);
  const [bottomNavHeight, setBottomNavHeight] = useState(0);

  // Accolades obligatoires : Chrome récent renvoie une Promise, que React prendrait pour un cleanup
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Mesure la vraie hauteur de la barre du bas (variable selon le nombre d'onglets, la langue,
  // ou un libellé qui passe sur 2 lignes) au lieu d'une marge fixe qui finit par chevaucher le contenu.
  useEffect(() => {
    const el = bottomNavRef.current;
    if (!el) return;
    const update = () => setBottomNavHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="min-h-screen md:pb-8"
      style={bottomNavHeight > 0 ? { paddingBottom: `calc(${bottomNavHeight}px + env(safe-area-inset-bottom))` } : undefined}
    >
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
                  `rounded-full px-3.5 py-1.5 text-sm ${isActive ? "bg-ink font-semibold text-white" : "text-slate-600 hover:bg-neutral-100"}`
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
              className="flex h-10 items-center gap-2 rounded-full bg-neutral-100 pe-3 ps-1 text-sm font-medium text-slate-700 hover:bg-slate-200"
              aria-label={t("nav_account")}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender text-sm font-bold text-ink">
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
        ref={bottomNavRef}
        className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-around border-t border-neutral-100 bg-white/95 px-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      >
        {nav.map(([to, key, icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex min-w-0 items-center rounded-full transition active:scale-95 ${
                isActive
                  ? "shrink-0 gap-1.5 bg-ink py-1 pe-3 ps-1 text-white"
                  : "flex-1 flex-col gap-0.5 py-1 text-neutral-400 hover:text-ink"
              }`
            }
          >
            {({ isActive }) =>
              isActive ? (
                <>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink">
                    <Icon name={icon} />
                  </span>
                  <span className="whitespace-nowrap text-[11px] font-bold">{t(key)}</span>
                </>
              ) : (
                <>
                  <Icon name={icon} />
                  <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{t(key)}</span>
                </>
              )
            }
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
