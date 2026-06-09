import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { me as meFn, logout as logoutFn } from "@/lib/pds.functions";

export type SessionUser = { id: string; rationId: string; name: string; role: "admin" | "distributor" | "customer"; phone: string | null };

type Ctx = {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: SessionUser) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);
const KEY = "pds.session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) { setLoading(false); return; }
    try {
      const parsed = JSON.parse(raw) as { token: string };
      meFn({ data: { token: parsed.token } })
        .then((r) => { setToken(parsed.token); setUser({ ...r.user, rationId: r.user.ration_id ?? r.user.rationId }); })
        .catch(() => localStorage.removeItem(KEY))
        .finally(() => setLoading(false));
    } catch { setLoading(false); }
  }, []);

  const setSession = (t: string, u: SessionUser) => {
    setToken(t); setUser(u);
    localStorage.setItem(KEY, JSON.stringify({ token: t }));
  };

  const signOut = async () => {
    if (token) { try { await logoutFn({ data: { token } }); } catch {} }
    setToken(null); setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(KEY);
      // Replace current history entry so Back doesn't return to the dashboard
      window.location.replace("/");
    }
  };

  return <SessionContext.Provider value={{ user, token, loading, setSession, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}
