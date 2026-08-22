import type { Case } from "../drizzle/schema";

export type ExtendedCaseRecord = Case & {
  lienAmount?: string | null;
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  disputeRefNumber?: string | null;
  ncrpAckNumber?: string | null;
  firNumber?: string | null;
  freezingAuthority?: string | null;
  [key: string]: any;
};

export function formatInr(amount: string | null | undefined): string {
  if (!amount) return "₹0";
  const num = Number(amount.replace(/[^0-9.-]+/g, ""));
  if (isNaN(num)) return `₹${amount}`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export function generateInitialNotice(input: {
  caseRecord: ExtendedCaseRecord;
  citizenName: string;
  citizenEmail?: string | null;
}) {
  const { caseRecord, citizenName, citizenEmail } = input;
  const formattedAmount = formatInr(caseRecord.lienAmount);
  const sentDate = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });
  
  const subject = `[CASE REF: ${caseRecord.caseId}] Formal Representation regarding Account Lien / Debit Freeze - ${caseRecord.bankName || "Bank"}`;

  const body = `Date: ${sentDate}
To:
1. The Branch Manager / Nodal Officer, ${caseRecord.bankName || "Concerned Bank"}${caseRecord.branchName ? ` (${caseRecord.branchName} Branch)` : ""}
2. The Investigating Officer / Cyber Crime Cell, ${caseRecord.freezingAuthority || "Concerned Cyber Cell"}

Subject: Representation for clarification & removal of lien/freeze on Account No. ${caseRecord.accountNumber || "N/A"} (Ref: ${caseRecord.caseId})

Respected Sir/Madam,

I, ${citizenName}${citizenEmail ? ` (${citizenEmail})` : ""}, am maintaining the savings/current account with details mentioned below:

1. ACCOUNT & LIEN DETAILS:
   - Account Holder Name: ${citizenName}
   - Bank Name: ${caseRecord.bankName || "N/A"}
   - Branch: ${caseRecord.branchName || "N/A"}
   - Account Number: ${caseRecord.accountNumber || "N/A"}
   - IFSC: ${caseRecord.ifscCode || "N/A"}
   - Disputed / Frozen Amount: ${formattedAmount}
   - Reference / Dispute ID: ${caseRecord.disputeRefNumber || "N/A"}
   - NCRP / Cybercrime Ack No.: ${caseRecord.ncrpAckNumber || "N/A"}
   - FIR / Police Diary No.: ${caseRecord.firNumber || "N/A"}

2. BRIEF SUMMARY OF THE GRIEVANCE:
   ${caseRecord.description}

3. REQUEST AND REPRESENTATION:
   I have noticed an unauthorized lien / debit restriction of ${formattedAmount} placed on my account. As per standard RBI guidelines and Hon'ble High Court precedents on cybercrime account freezing:
   a) A citizen is entitled to know the specific grounds, complaint reference, and requisitioning law enforcement agency for any lien.
   b) A freeze should only be confined to the disputed transacted amount and should not unjustifiably hinder legitimate day-to-day banking operations.
   
   I hereby request your good offices to:
   1. Provide the official requisition order copy / notice received under Section 102 CrPC / Section 106 BNSS.
   2. Clarify the status of the investigation concerning my transacted funds.
   3. Provide a timeline for verification and subsequent revocation of the lien.

Please treat this as a formal time-bound representation (LienGuard Case ID: ${caseRecord.caseId}). A response is requested within 7 business days.

Yours sincerely,
${citizenName}
LienGuard Citizen Reference: ${caseRecord.caseId}
`;

  return { subject, body };
}

export function generateFollowUpReminder(input: {
  caseRecord: ExtendedCaseRecord;
  citizenName: string;
  reminderNumber: number;
}) {
  const { caseRecord, citizenName, reminderNumber } = input;
  const formattedAmount = formatInr(caseRecord.lienAmount);
  const reminderOrdinal = reminderNumber === 1 ? "FIRST" : reminderNumber === 2 ? "SECOND" : "URGENT";
  const sentDate = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });

  const subject = `[${reminderOrdinal} REMINDER | CASE REF: ${caseRecord.caseId}] Non-Response regarding Lien of ${formattedAmount} on A/C ${caseRecord.accountNumber || ""}`;

  const body = `Date: ${sentDate}
To:
1. The Branch Manager / Grievance Redressal Officer, ${caseRecord.bankName || "Concerned Bank"}
2. The Investigating Officer / Cyber Crime Police Unit, ${caseRecord.freezingAuthority || "Concerned Cyber Cell"}

Subject: ${reminderOrdinal} REMINDER - Pending representation regarding lien/freeze on Account No. ${caseRecord.accountNumber || "N/A"} (LienGuard Case: ${caseRecord.caseId})

Respected Sir/Madam,

This is with reference to my earlier representation submitted regarding the lien/freeze of ${formattedAmount} on Account No. ${caseRecord.accountNumber || "N/A"} (LienGuard Ref: ${caseRecord.caseId}).

The stipulated response window has elapsed without any written clarification or investigation update from your office.

Key Case Specifics:
- Citizen Name: ${citizenName}
- Bank & Branch: ${caseRecord.bankName || "N/A"} - ${caseRecord.branchName || "N/A"}
- Account No.: ${caseRecord.accountNumber || "N/A"}
- NCRP Ack / FIR No.: ${caseRecord.ncrpAckNumber || caseRecord.firNumber || "N/A"}
- Affected Lien Amount: ${formattedAmount}

In the absence of any incriminating finding or charge-sheet against the undersigned bonafide account holder, the continued restriction without written reasons causes undue hardship and reputational injury.

I urgently request you to provide the investigation status / Section 102/106 notice within 3 business days, failing which this matter shall be formally escalated to the Bank's Principal Nodal Officer, the Superintendent of Police (Cyber Crime), and the Banking Ombudsman.

Yours sincerely,
${citizenName}
Case ID: ${caseRecord.caseId}
`;

  return { subject, body };
}

export function generateTier2Escalation(input: {
  caseRecord: ExtendedCaseRecord;
  citizenName: string;
}) {
  const { caseRecord, citizenName } = input;
  const formattedAmount = formatInr(caseRecord.lienAmount);
  const sentDate = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });

  const subject = `[ESCALATION TIER-2 | CASE REF: ${caseRecord.caseId}] Formal Escalation to Principal Nodal Officer / SP Cybercrime regarding Unresolved Lien`;

  const body = `Date: ${sentDate}
To:
1. The Principal Nodal Officer / Chief Grievance Officer, ${caseRecord.bankName || "Bank"}
2. The Superintendent of Police (SP) / Head of Cyber Crime Division, ${caseRecord.freezingAuthority || "State Cyber Crime Department"}

Subject: TIER-2 ESCALATION - Continued non-response to lien inquiries on A/C ${caseRecord.accountNumber || ""} (Ref: ${caseRecord.caseId})

Respected Authority,

I am formally escalating the matter of an unresolved bank lien / debit freeze of ${formattedAmount} placed on my bank account:

- Account Holder: ${citizenName}
- Bank / Branch: ${caseRecord.bankName || "N/A"} / ${caseRecord.branchName || "N/A"}
- Account Number: ${caseRecord.accountNumber || "N/A"}
- NCRP Complaint / FIR Ref: ${caseRecord.ncrpAckNumber || caseRecord.firNumber || "N/A"}
- Initial Representation Date: ${caseRecord.noticeSentAt ? new Date(caseRecord.noticeSentAt).toLocaleDateString("en-IN") : "Earlier"}
- Follow-up Reminders Sent: ${caseRecord.reminderCount || 0}

Despite prior notices and reminders, no formal communication or investigation findings have been furnished by the local branch / investigating unit.

Under the Master Direction on Customer Service by the Reserve Bank of India and guidelines on cybercrime lien management, bank customers are entitled to prompt grievance redressal and specific written justifications.

PRAYER:
1. Immediate review of the freeze by the Principal Nodal Officer.
2. Written confirmation of whether the freezing request was limited to the dispute value or the whole account.
3. Expedited clearance / de-freezing order if no direct culpability is established.

Yours sincerely,
${citizenName}
LienGuard Escalation Ref: ${caseRecord.caseId}
`;

  return { subject, body };
}

export function generateTier3Escalation(input: {
  caseRecord: ExtendedCaseRecord;
  citizenName: string;
}) {
  const { caseRecord, citizenName } = input;
  const formattedAmount = formatInr(caseRecord.lienAmount);
  const sentDate = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });

  const subject = `[ESCALATION TIER-3 | CASE REF: ${caseRecord.caseId}] Complaint under RBI Integrated Ombudsman Scheme / Cyber Appellate`;

  const body = `Date: ${sentDate}
To:
1. The Office of the Banking Ombudsman, Reserve Bank of India (RBI)
2. State Cyber Crime Nodal Appellate Authority

Subject: Formal Complaint regarding Deficiency in Banking Service & Unjustified Account Freeze (Case: ${caseRecord.caseId})

Respected Sir/Madam,

I wish to register a formal complaint under the Reserve Bank - Integrated Ombudsman Scheme, 2021 regarding deficiency of service by ${caseRecord.bankName || "the Bank"} and continuous inaction on my frozen funds of ${formattedAmount}.

CASE CHRONOLOGY & FACTS:
1. Account Details: ${citizenName}, A/C No. ${caseRecord.accountNumber || "N/A"}, ${caseRecord.bankName || "N/A"} (${caseRecord.branchName || "N/A"}).
2. Cyber Reference: NCRP Ack: ${caseRecord.ncrpAckNumber || "N/A"}, FIR: ${caseRecord.firNumber || "N/A"}.
3. The bank placed a debit freeze/lien without providing prior notice, copy of magistrate/police order, or written reasons.
4. Level 1 representation and Level 2 escalation to the Principal Nodal Officer have failed to yield a response within statutory timelines.

RELIEF SOUGHT:
1. Direct the bank to produce the official police requisition under Sec 102 CrPC / Sec 106 BNSS.
2. Restrict any lien strictly to the contested transacted amount without freezing the operational balance.
3. Order immediate removal of the lien upon completion of bonafide verification.
4. Award compensation for harassment and deficiency of banking services.

Yours faithfully,
${citizenName}
LienGuard Dossier ID: ${caseRecord.caseId}
`;

  return { subject, body };
}

export function generateRtiDraft(input: {
  caseRecord: ExtendedCaseRecord;
  citizenName: string;
  citizenAddress?: string;
}) {
  const { caseRecord, citizenName, citizenAddress = "[Applicant Address Line, City, State, PIN]" } = input;
  const formattedAmount = formatInr(caseRecord.lienAmount);
  const currentDate = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });

  const publicAuthority = caseRecord.freezingAuthority || `${caseRecord.bankName || "State Cyber Crime Police"} Public Information Cell`;
  const pioDesignation = `The Public Information Officer (PIO / CPIO), ${publicAuthority}`;

  const factsSummary = `The applicant holds Account No. ${caseRecord.accountNumber || "N/A"} with ${caseRecord.bankName || "the Bank"} (${caseRecord.branchName || "N/A"}). A lien/debit freeze of ${formattedAmount} was marked on the account citing cybercrime inquiry / NCRP Ack No. ${caseRecord.ncrpAckNumber || "N/A"} and FIR No. ${caseRecord.firNumber || "N/A"}. Representations sent to the branch and investigating cell on case reference ${caseRecord.caseId} remain unclarified.`;

  const queriesRequested = `1. Certified true copy of the official written order/requisition issued by the Law Enforcement Agency under Section 102 Cr.P.C. / Section 106 Bharatiya Nagarik Suraksha Sanhita (BNSS) pursuant to which lien/debit freeze was marked on Account No. ${caseRecord.accountNumber || "N/A"}.
2. The specific complaint / NCRP / FIR reference number, date of occurrence, and cybercrime portal acknowledgement under which the applicant's account has been implicated.
3. Details of the alleged transacted money trail showing the exact entry and exit points connecting the disputed funds (${formattedAmount}) with the applicant's account.
4. Whether the police requisition directed a total freeze of the bank account or specifically instructed a proportionate lien confined strictly to the disputed amount (${formattedAmount}).
5. The designated investigating officer's name, designation, official email ID, phone number, and police station jurisdiction handling this matter.
6. The current stage/status of the investigation regarding the applicant's account and the estimated statutory timeframe for issuance of a No Objection Certificate (NOC) / de-freeze order.`;

  const statutoryDeclaration = `I hereby declare that I am a Citizen of India and the information sought falls within the ambit of Section 2(f) and 2(j) of the Right to Information Act, 2005. The requisite application fee of ₹10 is paid via the prescribed mode.`;

  return {
    publicAuthority,
    pioDesignation,
    factsSummary,
    queriesRequested,
    statutoryDeclaration,
    fullDraftText: `FORM 'A' - APPLICATION FOR OBTAINING INFORMATION UNDER SECTION 6(1) OF THE RTI ACT, 2005

Date: ${currentDate}

To,
${pioDesignation}
${publicAuthority}

1. FULL NAME OF APPLICANT: ${citizenName}
2. POSTAL ADDRESS: ${citizenAddress}
3. CONTACT EMAIL / PHONE: Available on record / LienGuard Case ID: ${caseRecord.caseId}

4. PARTICULARS OF INFORMATION SOUGHT:
Subject: Request for certified records regarding Bank Lien & Police Requisition on Account No. ${caseRecord.accountNumber || "N/A"}

Background Facts:
${factsSummary}

Specific Information / Certified Copies Requested:
${queriesRequested}

5. APPLICATION FEE DETAILS:
₹10/- (Rupees Ten Only) remitted online / via Indian Postal Order (IPO).

6. STATUTORY DECLARATION:
${statutoryDeclaration}

Signature of the Applicant:
_____________________________
(${citizenName})
LienGuard Case ID: ${caseRecord.caseId}
`,
  };
}
