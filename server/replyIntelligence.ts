import { logSecurityEvent } from "./securityLog";

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
  promptInjectionDetected?: boolean;
  securityNotice?: string | null;
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

/**
 * Heuristics for adversarial prompt injection or instruction hijacking in inbound email bodies.
 */
const PROMPT_INJECTION_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i, description: "Instruction override attempt" },
  { pattern: /(reveal|disclose|show|print)\s+(your\s+)?(system\s+prompt|secret|api\s*key|password)/i, description: "System prompt leak attempt" },
  { pattern: /(change|set|update)\s+(the\s+)?(case\s+status|status)\s+to\s+(escalated|resolved|closed)/i, description: "Direct state change injection" },
  { pattern: /(send|forward|email)\s+(the\s+)?(documents|evidence|files)\s+to\s+[^\s@]+@[^\s@]+/i, description: "Exfiltration instruction injection" },
  { pattern: /(delete|drop|purge|truncate)\s+(all\s+)?(cases|records|database|users)/i, description: "Destructive instruction injection" },
  { pattern: /(grant|make|set)\s+(me|user)\s+(as\s+)?admin/i, description: "Privilege escalation injection" },
  { pattern: /<\s*script\b|javascript\s*:|data\s*:\s*text\/html/i, description: "Script / XSS injection" },
];

/**
 * Scans untrusted email text for prompt injection signatures.
 */
export function detectPromptInjection(text: string): { detected: boolean; reason?: string } {
  for (const { pattern, description } of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { detected: true, reason: description };
    }
  }
  return { detected: false };
}

/**
 * Analyzes inbound authority email.
 * SECURITY BOUNDARY:
 * 1. Email text is treated strictly as UNTRUSTED DATA.
 * 2. Prompt injection attempts are detected, logged, and isolated.
 * 3. AI outputs provide advisory classification only — NEVER execute privileged state changes directly.
 */
export function analyzeInboundReply(input: {
  subject: string;
  body: string;
  senderEmail?: string;
  caseId?: string;
}): ReplyAnalysisResult {
  // Cap inbound text scanning to bounded size (prevent memory exhaustion / ReDoS)
  const boundedSubject = input.subject.slice(0, 300);
  const boundedBody = input.body.slice(0, 20_000);
  const text = `${boundedSubject}\n${boundedBody}`.trim();
  const lower = text.toLowerCase();

  // 1. Prompt Injection Scanning
  const injectionCheck = detectPromptInjection(text);
  if (injectionCheck.detected) {
    logSecurityEvent({
      type: "PROMPT_INJECTION_DETECTED",
      caseId: input.caseId,
      details: {
        senderEmail: input.senderEmail,
        reason: injectionCheck.reason,
        snippet: text.slice(0, 200),
      },
      result: "WARNING",
    });
  }

  // 2. Detect Requested Documents
  const requestedDocuments: string[] = [];
  for (const { pattern, name } of DOCUMENT_PATTERNS) {
    if (pattern.test(text)) {
      requestedDocuments.push(name);
    }
  }

  // 3. Classify Intent and Posture
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
    citizenActionRequired = "Review rejection grounds and prepare procedural escalation or RTI draft.";
    suggestedNextStep = "Review formal grounds of rejection and consider proceeding with statutory escalation or RTI drafting.";
    urgency = "HIGH";
  } else if (
    lower.includes("under review") ||
    lower.includes("being examined") ||
    lower.includes("investigation in progress") ||
    lower.includes("verifying")
  ) {
    intent = "UNDER_REVIEW";
    confidence = "MEDIUM";
    summary = "Authority confirmed that the case and evidence are actively under investigative review.";
    authorityActionPromised = "Official review underway; clearance status will be updated upon completion.";
    suggestedNextStep = "Monitor case for authority updates or document requisitions.";
    urgency = "MEDIUM";
  } else if (
    lower.includes("has been received") ||
    lower.includes("duly acknowledged") ||
    lower.includes("matter is noted") ||
    lower.includes("acknowledged receipt") ||
    (lower.includes("acknowledged") && !lower.includes("unauthorized"))
  ) {
    intent = "ACKNOWLEDGED";
    confidence = "HIGH";
    summary = "Authority acknowledged receipt of your case notice.";
    suggestedNextStep = "Track statutory response deadline (48 hours) in the case timeline.";
    urgency = "LOW";
  }

  const disclaimer = "AI-assisted analysis. Review before taking action.";

  return {
    summary,
    intent,
    confidence,
    requestedDocuments,
    citizenActionRequired,
    authorityActionPromised,
    suggestedNextStep,
    urgency,
    disclaimer,
    analyzedAt: new Date().toISOString(),
    promptInjectionDetected: injectionCheck.detected,
    securityNotice: injectionCheck.detected
      ? `Security Advisory: An untrusted instruction or prompt injection attempt was detected in this message (${injectionCheck.reason}). It has been quarantined and will not execute.`
      : null,
  };
}
