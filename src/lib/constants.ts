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
export type EntitlementRule =
  | { kind: "per_person"; qty: number }
  | { kind: "per_family"; qty: number };

export const RATION_ITEMS: {
  name: string;
  category: RationItemCategory;
  rule?: EntitlementRule;
}[] = [
  { name: "Rice", category: "solid", rule: { kind: "per_person", qty: 5 } },
  { name: "Wheat", category: "solid", rule: { kind: "per_person", qty: 5 } },
  { name: "Maida", category: "solid", rule: { kind: "per_person", qty: 1 } },
  { name: "Bajra", category: "solid", rule: { kind: "per_person", qty: 2 } },
  { name: "Jowar", category: "solid", rule: { kind: "per_person", qty: 2 } },
  { name: "Sugar", category: "solid", rule: { kind: "per_family", qty: 1 } },
  { name: "Iodised Salt", category: "solid", rule: { kind: "per_family", qty: 1 } },
  { name: "Pulses (Dal)", category: "solid", rule: { kind: "per_family", qty: 1.5 } },
  { name: "Kerosene", category: "liquid", rule: { kind: "per_family", qty: 2 } },
  { name: "Oil", category: "liquid", rule: { kind: "per_family", qty: 1 } },
  { name: "Mustard Oil", category: "liquid", rule: { kind: "per_family", qty: 1 } },
  { name: "Other", category: "solid" },
];

/** Items that have an entitlement rule (everything except "Other"). */
export const ENTITLED_ITEMS = RATION_ITEMS.filter((i) => i.rule);

export function unitForItem(name: string): "kg" | "L" {
  const it = RATION_ITEMS.find((i) => i.name === name);
  return it?.category === "liquid" ? "L" : "kg";
}

/** Compute entitled quantity for an item given household size (head + family members). */
export function entitledQty(itemName: string, householdSize: number): number {
  const it = RATION_ITEMS.find((i) => i.name === itemName);
  if (!it?.rule) return 0;
  if (it.rule.kind === "per_person") return it.rule.qty * Math.max(1, householdSize);
  return it.rule.qty;
}

export const RELATIONS = [
  "Spouse","Son","Daughter","Brother","Sister","Mother","Father","Grandfather","Grandmother","Uncle","Aunt","Nephew","Niece","Other"
];
