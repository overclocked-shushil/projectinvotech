// Indian mobile phone helpers. Stored as +91XXXXXXXXXX, displayed as +91 XXXXX XXXXX.
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/; // 10 digits, starts with 6-9
export const PHONE_E164_IN_RE = /^\+91[6-9]\d{9}$/;

/** Strip any non-digit, drop leading 91 / +91, keep last 10 digits. */
export function normalizeIndianMobile(input: string): string {
  let d = (input || "").replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  return d.slice(-10);
}

export function isValidIndianMobile(d: string): boolean {
  return INDIAN_MOBILE_RE.test(d);
}

/** Convert any input form to canonical +91XXXXXXXXXX. Throws on invalid. */
export function toE164India(input: string): string {
  const d = normalizeIndianMobile(input);
  if (!isValidIndianMobile(d)) throw new Error("Please enter a valid Indian mobile number");
  return "+91" + d;
}

/** Pretty display: +91 XXXXX XXXXX. Accepts E.164 or 10 digits. */
export function formatIndianMobile(input?: string | null): string {
  if (!input) return "—";
  const d = normalizeIndianMobile(input);
  if (d.length !== 10) return input;
  return `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
}

export const INDIAN_MOBILE_ERROR = "Please enter a valid Indian mobile number";
