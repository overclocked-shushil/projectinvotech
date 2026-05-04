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

export type RationItemCategory = "solid" | "liquid";
export const RATION_ITEMS: { name: string; category: RationItemCategory }[] = [
  { name: "Rice", category: "solid" },
  { name: "Wheat", category: "solid" },
  { name: "Kerosene", category: "liquid" },
  { name: "Sugar", category: "solid" },
  { name: "Oil", category: "liquid" },
  { name: "Iodised Salt", category: "solid" },
  { name: "Pulses (Dal)", category: "solid" },
  { name: "Maida", category: "solid" },
  { name: "Bajra", category: "solid" },
  { name: "Jowar", category: "solid" },
  { name: "Mustard Oil", category: "liquid" },
  { name: "Other", category: "solid" },
];
export function unitForItem(name: string): "kg" | "L" {
  const it = RATION_ITEMS.find((i) => i.name === name);
  return it?.category === "liquid" ? "L" : "kg";
}

export const RELATIONS = [
  "Spouse","Son","Daughter","Brother","Sister","Mother","Father","Grandfather","Grandmother","Uncle","Aunt","Nephew","Niece","Other"
];
