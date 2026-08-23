import { AuthorityDirectoryEntry, AuthorityType } from "../drizzle/schema";

/** Canonical State/UT names for India (36 states and union territories). */
const CANONICAL_STATE_NAMES: Record<string, string> = {
  // States
  "andhra pradesh": "Andhra Pradesh",
  ap: "Andhra Pradesh",
  "arunachal pradesh": "Arunachal Pradesh",
  assam: "Assam",
  bihar: "Bihar",
  chhattisgarh: "Chhattisgarh",
  goa: "Goa",
  gujarat: "Gujarat",
  haryana: "Haryana",
  "himachal pradesh": "Himachal Pradesh",
  jharkhand: "Jharkhand",
  karnataka: "Karnataka",
  kerala: "Kerala",
  "madhya pradesh": "Madhya Pradesh",
  mp: "Madhya Pradesh",
  maharashtra: "Maharashtra",
  manipur: "Manipur",
  meghalaya: "Meghalaya",
  mizoram: "Mizoram",
  nagaland: "Nagaland",
  odisha: "Odisha",
  orissa: "Odisha",
  punjab: "Punjab",
  rajasthan: "Rajasthan",
  sikkim: "Sikkim",
  "tamil nadu": "Tamil Nadu",
  tn: "Tamil Nadu",
  telangana: "Telangana",
  tripura: "Tripura",
  "uttar pradesh": "Uttar Pradesh",
  up: "Uttar Pradesh",
  uttarakhand: "Uttarakhand",
  uttaranchal: "Uttarakhand",
  "west bengal": "West Bengal",
  wb: "West Bengal",
  // Union Territories
  "andaman and nicobar islands": "Andaman and Nicobar Islands",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  chandigarh: "Chandigarh",
  "dadra and nagar haveli and daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  delhi: "Delhi",
  "new delhi": "Delhi",
  nct: "Delhi",
  "jammu and kashmir": "Jammu and Kashmir",
  "jammu & kashmir": "Jammu and Kashmir",
  jk: "Jammu and Kashmir",
  ladakh: "Ladakh",
  lakshadweep: "Lakshadweep",
  puducherry: "Puducherry",
  pondicherry: "Puducherry",
};

/** Normalize a user-supplied State/UT string to canonical form for lookup. */
export function normalizeStateUt(input: string): string {
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, " ");
  return CANONICAL_STATE_NAMES[cleaned] || input.trim();
}

/** Map case type strings to the appropriate authority type for routing. */
export function getCaseTypeAuthorityType(caseType: string): AuthorityType {
  const lower = caseType.toLowerCase();
  if (
    lower.includes("cyber") ||
    lower.includes("fraud") ||
    lower.includes("online") ||
    lower.includes("digital") ||
    lower.includes("phishing") ||
    lower.includes("upi") ||
    lower.includes("scam")
  ) {
    return "CYBER_CELL";
  }
  if (lower.includes("bank") || lower.includes("nodal") || lower.includes("lien")) {
    return "BANK_NODAL";
  }
  if (lower.includes("grievance")) {
    return "GRIEVANCE_OFFICER";
  }
  return "CYBER_CELL"; // Default for lien/dispute cases
}

export type AuthorityRoutingResult = {
  authority: AuthorityDirectoryEntry;
  canonicalStateUt: string;
  authorityType: AuthorityType;
  routingReason: string;
  hasContactDetails: boolean;
};

export type AuthorityRoutingInput = {
  stateUt: string;
  caseType: string;
  district?: string;
};

/**
 * Deterministic authority routing — database-driven, no AI, no fabrication.
 * Returns null if no active authority record exists for the given State/UT + case type.
 */
export async function getRecommendedAuthority(
  input: AuthorityRoutingInput,
  lookupFn: (stateUt: string, authorityType: AuthorityType) => Promise<AuthorityDirectoryEntry | undefined>,
): Promise<AuthorityRoutingResult | null> {
  const canonicalStateUt = normalizeStateUt(input.stateUt);
  const authorityType = getCaseTypeAuthorityType(input.caseType);

  const authority = await lookupFn(canonicalStateUt, authorityType);
  if (!authority) return null;

  const hasContactDetails = Boolean(authority.officialEmail || authority.phone);
  const routingReason = `Matched ${authorityType} authority for ${canonicalStateUt} from ${authority.sourceName}.`;

  return {
    authority,
    canonicalStateUt,
    authorityType,
    routingReason,
    hasContactDetails,
  };
}
