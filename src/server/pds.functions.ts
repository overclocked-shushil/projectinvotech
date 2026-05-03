import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSms, maskPhone } from "./sms.server";
import { RATION_ID_RE, NAME_RE, generateOtp, generateToken, requireSession, type Role } from "./auth.server";

const rationId = z.string().regex(RATION_ID_RE, "Invalid Ration Number format");
const portal = z.enum(["admin", "distributor", "customer"]);

// ============ REQUEST OTP ============
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { rationId: string; portal: Role }) =>
    z.object({ rationId, portal }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("ration_id", data.rationId)
      .maybeSingle();

    // For customers: allow auto-registration on first OTP request? No — they must register.
    // For admin: must exist (seeded). For distributor: must be created by admin.
    if (!user) {
      // Customers self-register, but we need a phone first. For login via existing ID:
      if (data.portal === "customer") {
        throw new Error("No account found. Please register first.");
      }
      throw new Error("Invalid credentials for this portal.");
    }

    if (user.role !== data.portal) {
      throw new Error("Invalid credentials for this portal.");
    }

    if (!user.phone) {
      throw new Error("No phone number on file. Contact admin.");
    }

    // Invalidate prior OTPs
    await supabaseAdmin.from("otps").update({ used: true }).eq("ration_id", data.rationId).eq("used", false);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabaseAdmin.from("otps").insert({ ration_id: data.rationId, code, expires_at: expiresAt });

    const sms = await sendSms(user.phone, `Your PDS OTP is ${code}. Valid for 5 minutes.`);

    return {
      ok: true,
      maskedPhone: maskPhone(user.phone),
      expiresAt,
      // Only returned in dev when SMS isn't configured:
      devOtp: sms.debugCode ? code : undefined,
    };
  });

// ============ VERIFY OTP ============
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { rationId: string; portal: Role; code: string }) =>
    z.object({ rationId, portal, code: z.string().regex(/^\d{6}$/) }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("ration_id", data.rationId)
      .maybeSingle();
    if (!user || user.role !== data.portal) throw new Error("Invalid credentials for this portal.");

    const { data: otp } = await supabaseAdmin
      .from("otps")
      .select("*")
      .eq("ration_id", data.rationId)
      .eq("code", data.code)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) throw new Error("Invalid OTP");
    if (new Date(otp.expires_at).getTime() < Date.now()) throw new Error("OTP expired");

    await supabaseAdmin.from("otps").update({ used: true }).eq("id", otp.id);

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from("sessions").insert({ token, user_id: user.id, expires_at: expiresAt });

    return { token, user: { id: user.id, rationId: user.ration_id, name: user.name, role: user.role, phone: user.phone } };
  });

// ============ REGISTER CUSTOMER ============
export const registerCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { rationId: string; name: string; phone: string }) =>
    z.object({
      rationId,
      name: z.string().trim().regex(NAME_RE, "Invalid name"),
      phone: z.string().min(8).max(20),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin.from("users").select("id").eq("ration_id", data.rationId).maybeSingle();
    if (existing) throw new Error("This Ration Number is already registered.");
    await supabaseAdmin.from("users").insert({
      ration_id: data.rationId,
      role: "customer",
      name: data.name.trim(),
      phone: data.phone.trim(),
    });
    return { ok: true };
  });

// ============ ME ============
export const me = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    return { user };
  });

// ============ LOGOUT ============
export const logout = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("sessions").delete().eq("token", data.token);
    return { ok: true };
  });

// ============ ADMIN: Create Distributor / Customer ID ============
export const adminCreateId = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; rationId: string; role: "distributor" | "customer"; name: string; phone: string }) =>
    z.object({
      token: z.string(),
      rationId,
      role: z.enum(["distributor", "customer"]),
      name: z.string().trim().regex(NAME_RE, "Invalid name"),
      phone: z.string().min(8).max(20),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "admin") throw new Error("Forbidden");
    const { data: existing } = await supabaseAdmin.from("users").select("id").eq("ration_id", data.rationId).maybeSingle();
    if (existing) throw new Error("Ration Number already exists");
    await supabaseAdmin.from("users").insert({
      ration_id: data.rationId,
      role: data.role,
      name: data.name.trim(),
      phone: data.phone.trim(),
    });
    return { ok: true };
  });

// ============ ADMIN: list ============
export const adminList = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "admin") throw new Error("Forbidden");
    const { data: users } = await supabaseAdmin.from("users").select("*").order("created_at", { ascending: false });
    const { data: collections } = await supabaseAdmin.from("ration_collections").select("*").order("date_received", { ascending: false }).limit(200);
    const { data: complaints } = await supabaseAdmin.from("complaints").select("*").order("created_at", { ascending: false });
    return { users: users ?? [], collections: collections ?? [], complaints: complaints ?? [] };
  });

// ============ FAMILY ============
export const addFamily = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; name: string; dob: string; relation: string }) =>
    z.object({
      token: z.string(),
      name: z.string().trim().regex(NAME_RE, "Invalid name"),
      dob: z.string().min(4),
      relation: z.string().min(1).max(50),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "customer") throw new Error("Forbidden");
    await supabaseAdmin.from("families").insert({
      customer_id: user.id, name: data.name.trim(), dob: data.dob, relation: data.relation,
    });
    return { ok: true };
  });

export const listFamily = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "customer") throw new Error("Forbidden");
    const { data: rows } = await supabaseAdmin.from("families").select("*").eq("customer_id", user.id).order("created_at");
    return { family: rows ?? [] };
  });

// ============ DISTRIBUTOR: lookup customer & record collection ============
export const lookupCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; rationId: string }) =>
    z.object({ token: z.string(), rationId }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "distributor") throw new Error("Forbidden");
    const { data: c } = await supabaseAdmin.from("users").select("*").eq("ration_id", data.rationId).eq("role", "customer").maybeSingle();
    if (!c) throw new Error("Customer not found");
    const { data: family } = await supabaseAdmin.from("families").select("*").eq("customer_id", c.id);
    return { customer: c, family: family ?? [] };
  });

const itemSchema = z.object({
  name: z.string().min(1).max(50),
  quantity: z.number().min(0.01).max(10000),
  unit: z.string().min(1).max(20),
});

export const recordCollection = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; customerRationId: string; items: { name: string; quantity: number; unit: string }[] }) =>
    z.object({
      token: z.string(),
      customerRationId: rationId,
      items: z.array(itemSchema).min(1).max(20),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "distributor") throw new Error("Forbidden");
    const { data: c } = await supabaseAdmin.from("users").select("*").eq("ration_id", data.customerRationId).eq("role", "customer").maybeSingle();
    if (!c) throw new Error("Customer not found");
    const { data: row, error } = await supabaseAdmin.from("ration_collections").insert({
      customer_id: c.id, distributor_id: user.id, items: data.items, status: "Completed",
    }).select().single();
    if (error) throw new Error(error.message);
    return { transaction: row };
  });

// ============ TRANSACTIONS for current user ============
export const myTransactions = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    let query = supabaseAdmin.from("ration_collections").select("*, customer:users!ration_collections_customer_id_fkey(name, ration_id), distributor:users!ration_collections_distributor_id_fkey(name, ration_id)").order("date_received", { ascending: false });
    if (user.role === "customer") query = query.eq("customer_id", user.id);
    else if (user.role === "distributor") query = query.eq("distributor_id", user.id);
    const { data: rows, error } = await query.limit(500);
    if (error) throw new Error(error.message);
    return { transactions: rows ?? [] };
  });

// ============ COMPLAINTS ============
export const submitComplaint = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; phone: string; branch: string; reason: string }) =>
    z.object({
      name: z.string().trim().regex(NAME_RE, "Invalid name"),
      phone: z.string().min(8).max(20),
      branch: z.string().min(1).max(100),
      reason: z.string().min(5).max(1000),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    await supabaseAdmin.from("complaints").insert({
      name: data.name.trim(), phone: data.phone.trim(), branch: data.branch.trim(), reason: data.reason.trim(),
    });
    return { ok: true };
  });
