import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, ApiError, setUnauthorizedHandler, tokenStore } from "./api";
import { useI18n } from "./i18n";
import type { User } from "./types";

interface Auth {
  user: User | null;
  ready: boolean;
  /** Serveur injoignable au démarrage (réseau, redémarrage) : on garde la session. */
  offline: boolean;
  retry: () => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<Auth>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  const loadMe = useCallback(async () => {
    const me = await api.get<User>("/api/auth/me");
    setUser(me);
    setLang(me.language);
  }, [setLang]);

  const restore = useCallback(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    setOffline(false);
    loadMe()
      .catch((e) => {
        // Seul un jeton refusé (401) déconnecte ; une coupure réseau garde la session
        if (e instanceof ApiError && e.status === 401) logout();
        else setOffline(true);
      })
      .finally(() => setReady(true));
  }, [loadMe, logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    restore();
  }, [restore, logout]);

  const login = async (username: string, password: string) => {
    const { access_token } = await api.post<{ access_token: string }>("/api/auth/login", { username, password });
    tokenStore.set(access_token);
    await loadMe();
  };

  return (
    <Ctx.Provider value={{ user, ready, offline, retry: restore, login, logout }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
