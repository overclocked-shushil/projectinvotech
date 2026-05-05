import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSms, maskPhone } from "./sms.server";
import { RATION_ID_RE, NAME_RE, generateOtp, generateToken, requireSession, ensureAdminSeeded, isOldEnough, type Role } from "./auth.server";

const rationId = z.string().regex(RATION_ID_RE, "Invalid Ration Number format");
const portal = z.enum(["admin", "distributor", "customer"]);
const phoneSchema = z.string().trim().min(8).max(20);

// ============ REQUEST OTP ============
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { rationId?: string; phone?: string; portal: Role }) =>
    z.object({ rationId: rationId.optional(), phone: phoneSchema.optional(), portal })
      .refine((v) => v.rationId || v.phone, { message: "Identifier required" })
      .parse(d)
  )
  .handler(async ({ data }) => {
    await ensureAdminSeeded();

    let q = supabaseAdmin.from("users").select("*");
    if (data.rationId) q = q.eq("ration_id", data.rationId);
    else q = q.eq("phone", data.phone!);
    const { data: user } = await q.maybeSingle();

    if (!user) {
      if (data.portal === "customer") {
        throw new Error("Invalid Customer ID. Please contact your Admin.");
      }
      throw new Error("Invalid credentials for this portal.");
    }

    if (user.role !== data.portal) {
      throw new Error("Invalid credentials for this portal.");
    }
    if (!user.phone) {
      throw new Error("No phone number on file. Contact admin.");
    }

    await supabaseAdmin.from("otps").update({ used: true }).eq("ration_id", user.ration_id).eq("used", false);

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabaseAdmin.from("otps").insert({ ration_id: user.ration_id, code, expires_at: expiresAt });

    const sms = await sendSms(user.phone, `Your PDS OTP is ${code}. Valid for 5 minutes.`);

    return {
      ok: true,
      maskedPhone: maskPhone(user.phone),
      expiresAt,
      devOtp: sms.debugCode ? code : undefined,
    };
  });

// ============ VERIFY OTP ============
export const verifyOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { rationId?: string; phone?: string; portal: Role; code: string }) =>
    z.object({
      rationId: rationId.optional(),
      phone: phoneSchema.optional(),
      portal,
      code: z.string().regex(/^\d{6}$/),
    }).refine((v) => v.rationId || v.phone, { message: "Identifier required" }).parse(d)
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin.from("users").select("*");
    if (data.rationId) q = q.eq("ration_id", data.rationId);
    else q = q.eq("phone", data.phone!);
    const { data: user } = await q.maybeSingle();
    if (!user || user.role !== data.portal) throw new Error("Invalid credentials for this portal.");

    const { data: otp } = await supabaseAdmin
      .from("otps")
      .select("*")
      .eq("ration_id", user.ration_id)
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
      phone: phoneSchema,
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "admin") throw new Error("Forbidden");
    const phone = data.phone.trim();
    const { data: existingId } = await supabaseAdmin.from("users").select("id").eq("ration_id", data.rationId).maybeSingle();
    if (existingId) throw new Error("Ration Number already exists");
    const { data: existingPhone } = await supabaseAdmin.from("users").select("id").eq("phone", phone).maybeSingle();
    if (existingPhone) throw new Error("This number is already registered. Please contact Admin.");
    await supabaseAdmin.from("users").insert({
      ration_id: data.rationId,
      role: data.role,
      name: data.name.trim(),
      phone,
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

// ============ ADMIN: close complaint ============
export const adminCloseComplaint = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; complaintId: string }) =>
    z.object({ token: z.string(), complaintId: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "admin") throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("complaints").update({ status: "Resolved" }).eq("id", data.complaintId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ FAMILY (admin-managed) ============
export const adminAddFamily = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; customerRationId: string; name: string; dob: string; relation: string }) =>
    z.object({
      token: z.string(),
      customerRationId: rationId,
      name: z.string().trim().regex(NAME_RE, "Invalid name"),
      dob: z.string().min(4),
      relation: z.string().min(1).max(50),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "admin") throw new Error("Forbidden");
    if (!isOldEnough(data.dob)) {
      throw new Error("Age must be at least 8 years. Please enter a valid date of birth.");
    }
    const { data: c } = await supabaseAdmin.from("users").select("id").eq("ration_id", data.customerRationId).eq("role", "customer").maybeSingle();
    if (!c) throw new Error("Customer not found");
    await supabaseAdmin.from("families").insert({
      customer_id: c.id, name: data.name.trim(), dob: data.dob, relation: data.relation,
    });
    return { ok: true };
  });

export const adminUpdateFamily = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string; name: string; dob: string; relation: string }) =>
    z.object({
      token: z.string(),
      id: z.string().uuid(),
      name: z.string().trim().regex(NAME_RE, "Invalid name"),
      dob: z.string().min(4),
      relation: z.string().min(1).max(50),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "admin") throw new Error("Forbidden");
    if (!isOldEnough(data.dob)) {
      throw new Error("Age must be at least 8 years. Please enter a valid date of birth.");
    }
    const { error } = await supabaseAdmin.from("families").update({
      name: data.name.trim(), dob: data.dob, relation: data.relation,
    }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteFamily = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; id: string }) =>
    z.object({ token: z.string(), id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "admin") throw new Error("Forbidden");
    const { error } = await supabaseAdmin.from("families").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListFamily = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; customerRationId: string }) =>
    z.object({ token: z.string(), customerRationId: rationId }).parse(d)
  )
  .handler(async ({ data }) => {
    const { user } = await requireSession(data.token);
    if (user.role !== "admin") throw new Error("Forbidden");
    const { data: c } = await supabaseAdmin.from("users").select("id").eq("ration_id", data.customerRationId).eq("role", "customer").maybeSingle();
    if (!c) throw new Error("Customer not found");
    const { data: rows } = await supabaseAdmin.from("families").select("*").eq("customer_id", c.id).order("created_at");
    return { family: rows ?? [] };
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
export const checkComplaintEligibility = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string }) => z.object({ phone: phoneSchema }).parse(d))
  .handler(async ({ data }) => {
    const phone = data.phone.trim();
    const { data: user } = await supabaseAdmin
      .from("users").select("id, name, role").eq("phone", phone).eq("role", "customer").maybeSingle();
    if (!user) {
      throw new Error("You are not a registered customer. Only registered customers can file complaints.");
    }
    return { ok: true, name: user.name };
  });

export const submitComplaint = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; phone: string; branch: string; reason: string }) =>
    z.object({
      name: z.string().trim().regex(NAME_RE, "Invalid name"),
      phone: phoneSchema,
      branch: z.string().min(1).max(100),
      reason: z.string().min(5).max(1000),
    }).parse(d)
  )
  .handler(async ({ data }) => {
    const phone = data.phone.trim();
    const { data: user } = await supabaseAdmin
      .from("users").select("id").eq("phone", phone).eq("role", "customer").maybeSingle();
    if (!user) {
      throw new Error("You are not a registered customer. Only registered customers can file complaints.");
    }
    await supabaseAdmin.from("complaints").insert({
      name: data.name.trim(), phone, branch: data.branch.trim(), reason: data.reason.trim(),
    });
    return { ok: true };
  });
