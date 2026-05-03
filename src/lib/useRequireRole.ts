import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession, type SessionUser } from "@/lib/session";

export function useRequireRole(role: SessionUser["role"], loginHref: string) {
  const { user, loading } = useSession();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user) nav({ to: loginHref });
    else if (user.role !== role) nav({ to: "/" });
  }, [user, loading, role, loginHref, nav]);
  return { user, loading };
}
