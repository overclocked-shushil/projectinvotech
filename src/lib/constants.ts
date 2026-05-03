export const ADMIN_RATION_ID = "ADMIN001";
// Accepts the fixed admin ID or standard 4-letter + 6-digit format
export const RATION_ID_RE = /^(ADMIN001|[A-Z]{4}[0-9]{6})$/;
export const NAME_RE = /^[A-Za-z\s]{2,50}$/;

export const MIN_AGE_YEARS = 8;
export const AGE_ERROR = `Age must be at least ${MIN_AGE_YEARS} years. Please enter a valid date of birth.`;

/** Returns YYYY-MM-DD for the latest allowable DOB (today minus MIN_AGE_YEARS). */
export function maxDobString(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE_YEARS);
  return d.toISOString().slice(0, 10);
}

/** True when the given YYYY-MM-DD represents an age >= MIN_AGE_YEARS. */
export function isOldEnough(dob: string): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE_YEARS);
  // birth must be on or before cutoff
  return birth.getTime() <= cutoff.getTime();
}

export const RATION_ITEMS = [
  "Rice","Wheat","Kerosene","Sugar","Oil","Iodised Salt","Pulses (Dal)","Maida","Bajra","Jowar","Mustard Oil","Other"
];

export const RELATIONS = [
  "Spouse","Son","Daughter","Brother","Sister","Mother","Father","Grandfather","Grandmother","Uncle","Aunt","Nephew","Niece","Other"
];
