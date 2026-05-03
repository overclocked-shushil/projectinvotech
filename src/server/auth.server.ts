import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { randomBytes } from "crypto";

export const ADMIN_PHONE = "+917021423661";

let _seedPromise: Promise<void> | null = null;
export async function ensureAdminSeeded(): Promise<void> {
  if (_seedPromise) return _seedPromise;
  _seedPromise = (async () => {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id, phone")
      .eq("ration_id", "ADMIN001")
      .maybeSingle();
    if (!data) {
      await supabaseAdmin.from("users").insert({
        ration_id: "ADMIN001",
        role: "admin",
        name: "System Administrator",
        phone: ADMIN_PHONE,
      });
    } else if (!data.phone) {
      await supabaseAdmin.from("users").update({ phone: ADMIN_PHONE }).eq("id", data.id);
    }
  })().catch((e) => {
    _seedPromise = null;
    throw e;
  });
  return _seedPromise;
}

export const ADMIN_RATION_ID = "ADMIN001";
export const RATION_ID_RE = /^(ADMIN001|[A-Z]{4}[0-9]{6})$/;
export const NAME_RE = /^[A-Za-z\s]{2,50}$/;
export const MIN_AGE_YEARS = 8;

export function isOldEnough(dob: string): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE_YEARS);
  return birth.getTime() <= cutoff.getTime();
}

export type Role = "admin" | "distributor" | "customer";

export async function requireSession(token: string | undefined | null) {
  if (!token) throw new Error("Not authenticated");
  const { data, error } = await supabaseAdmin
    .from("sessions")
    .select("token, user_id, expires_at, users:users(*)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) throw new Error("Invalid session");
  if (new Date(data.expires_at).getTime() < Date.now()) throw new Error("Session expired");
  // @ts-ignore
  return { user: data.users as any };
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
