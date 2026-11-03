import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, setUnauthorizedHandler, tokenStore } from "./api";
import { useI18n } from "./i18n";
import type { User } from "./types";

interface Auth {
  user: User | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<Auth>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  const loadMe = useCallback(async () => {
    const me = await api.get<User>("/api/auth/me");
    setUser(me);
    setLang(me.language);
  }, [setLang]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    loadMe()
      .catch(logout)
      .finally(() => setReady(true));
  }, [loadMe, logout]);

  const login = async (username: string, password: string) => {
    const { access_token } = await api.post<{ access_token: string }>("/api/auth/login", { username, password });
    tokenStore.set(access_token);
    await loadMe();
  };

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
