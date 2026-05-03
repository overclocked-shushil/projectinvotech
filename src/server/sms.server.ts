// Twilio SMS helper. Falls back to console-log if Twilio env not present.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export async function sendSms(to: string, body: string): Promise<{ ok: boolean; debugCode?: string; error?: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
  const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

  if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM) {
    console.log(`[SMS:DEV] -> ${to}: ${body}`);
    return { ok: true, debugCode: body };
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[SMS] Twilio error [${res.status}]:`, data);
      return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[SMS] send failed", e);
    return { ok: false, error: (e as Error).message };
  }
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const trimmed = phone.replace(/\s+/g, "");
  if (trimmed.length < 4) return "*".repeat(trimmed.length);
  const last2 = trimmed.slice(-2);
  const cc = trimmed.startsWith("+") ? trimmed.slice(0, 3) : "";
  return `${cc} ${"*".repeat(Math.max(trimmed.length - cc.length - 2, 4))} ${last2}`.trim();
}
