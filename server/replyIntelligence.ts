export type ReplyIntent =
  | "REQUESTING_DOCUMENTS"
  | "ACKNOWLEDGED"
  | "UNDER_REVIEW"
  | "ACTION_REQUIRED"
  | "RESOLVED"
  | "REJECTED"
  | "NEEDS_CLARIFICATION"
  | "NO_CLEAR_ACTION";

export type ReplyAnalysisResult = {
  summary: string;
  intent: ReplyIntent;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  requestedDocuments: string[];
  citizenActionRequired: string | null;
  authorityActionPromised: string | null;
  suggestedNextStep: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  disclaimer: string;
  analyzedAt: string;
};

const DOCUMENT_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\b(bank\s+statement|account\s+statement|statement\s+of\s+account)\b/i, name: "Original Bank / Account Statement" },
  { pattern: /\b(account[- ]opening\s+form|account[- ]opening\s+document|kyc\s+form)\b/i, name: "Account-Opening Documentation / KYC Form" },
  { pattern: /\b(fir\s+copy|police\s+complaint|ncr\s+copy|acknowledgement\s+receipt)\b/i, name: "Copy of FIR / Police Complaint" },
  { pattern: /\b(identity\s+proof|id\s+proof|aadhaar|pan\s+card|passport|voter\s+id)\b/i, name: "Government-Issued Identity Proof (Aadhaar / PAN)" },
  { pattern: /\b(transaction\s+receipt|utr\s+slip|payment\s+proof|p2p\s+receipt)\b/i, name: "Transaction Receipt / UTR Proof" },
  { pattern: /\b(indemnity\s+bond|affidavit|undertaking)\b/i, name: "Notarized Indemnity Bond / Affidavit" },
  { pattern: /\b(noc|no[- ]objection\s+certificate|clearance\s+certificate)\b/i, name: "No-Objection Certificate (NOC)" },
];

export function analyzeInboundReply(input: {
  subject: string;
  body: string;
  senderEmail?: string;
  caseId?: string;
}): ReplyAnalysisResult {
  const text = `${input.subject}\n${input.body}`.trim();
  const lower = text.toLowerCase();

  // 1. Detect Requested Documents
  const requestedDocuments: string[] = [];
  for (const { pattern, name } of DOCUMENT_PATTERNS) {
    if (pattern.test(text)) {
      requestedDocuments.push(name);
    }
  }

  // 2. Classify Intent and Posture
  let intent: ReplyIntent = "NO_CLEAR_ACTION";
  let summary = "Inbound authority response recorded in case register.";
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
  let citizenActionRequired: string | null = null;
  let authorityActionPromised: string | null = null;
  let suggestedNextStep = "Review the authority reply and verify case posture.";
  let urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";

  if (
    lower.includes("resolved") ||
    lower.includes("lien revoked") ||
    lower.includes("lien removed") ||
    lower.includes("unfrozen") ||
    lower.includes("noc issued") ||
    lower.includes("clearance granted") ||
    lower.includes("account cleared")
  ) {
    intent = "RESOLVED";
    confidence = "HIGH";
    summary = "Authority indicated that the lien / freezing order has been resolved or revoked.";
    authorityActionPromised = "Clearance instructions transmitted to nodal bank operations.";
    citizenActionRequired = "Verify with your bank branch that the lien hold has been lifted.";
    suggestedNextStep = "Confirm account unfreezing with bank and update case status to RESOLVED.";
    urgency = "LOW";
  } else if (
    requestedDocuments.length > 0 ||
    lower.includes("please provide") ||
    lower.includes("require the following") ||
    lower.includes("submit the") ||
    lower.includes("furnish") ||
    lower.includes("send us")
  ) {
    intent = "REQUESTING_DOCUMENTS";
    confidence = "HIGH";
    summary = `Authority acknowledged correspondence and requested ${requestedDocuments.length > 0 ? requestedDocuments.length + " document(s)" : "additional documentation"} to proceed with verification.`;
    citizenActionRequired = `Upload requested documents (${requestedDocuments.length > 0 ? requestedDocuments.join(", ") : "supporting evidence"}) in the Documents tab.`;
    authorityActionPromised = "Investigation will proceed upon receipt and verification of requested documentation.";
    suggestedNextStep = "Upload the requested documents to the case document repository and submit formal response.";
    urgency = "HIGH";
  } else if (
    lower.includes("reject") ||
    lower.includes("denied") ||
    lower.includes("no merit") ||
    lower.includes("cannot be lifted") ||
    lower.includes("unauthorized request")
  ) {
    intent = "REJECTED";
    confidence = "HIGH";
    summary = "Authority reviewed the inquiry and rejected the request to lift the lien.";
    citizenActionRequired = "Review recorded legal grounds for rejection and prepare administrative appeal or RTI draft.";
    suggestedNextStep = "Review statutory RTI drafting options under Section 6(1) or escalate to appellate authority.";
    urgency = "HIGH";
  } else if (
    lower.includes("received") ||
    lower.includes("acknowledged") ||
    lower.includes("registered") ||
    lower.includes("under investigation") ||
    lower.includes("under review") ||
    lower.includes("being looked into") ||
    lower.includes("examining")
  ) {
    intent = "ACKNOWLEDGED";
    confidence = "HIGH";
    summary = "Authority formally acknowledged receipt of the complaint; official inquiry is actively underway.";
    authorityActionPromised = "Investigative review in progress. Further updates will be transmitted pursuant to procedural rules.";
    suggestedNextStep = "Monitor statutory response window. If no update within 48 hours, proceed to Nodal Bank escalation.";
    urgency = "LOW";
  } else if (
    lower.includes("clarify") ||
    lower.includes("verify") ||
    lower.includes("confirm whether") ||
    lower.includes("dispute")
  ) {
    intent = "NEEDS_CLARIFICATION";
    confidence = "MEDIUM";
    summary = "Authority requires procedural clarification regarding transaction details or account ownership.";
    citizenActionRequired = "Provide factual clarification and verify transaction timeline.";
    suggestedNextStep = "Submit formal written clarification referencing the case ID.";
    urgency = "MEDIUM";
  }

  return {
    summary,
    intent,
    confidence,
    requestedDocuments,
    citizenActionRequired,
    authorityActionPromised,
    suggestedNextStep,
    urgency,
    disclaimer: "AI-assisted analysis. Review before taking action.",
    analyzedAt: new Date().toISOString(),
  };
}
