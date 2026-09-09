import { OFFICIAL_CYBER_AUTHORITIES } from '../../../server/authoritySeedData';

export interface StaticDemoState {
  user: {
    id: number;
    openId: string;
    name: string;
    email: string;
    role: 'citizen' | 'bank' | 'authority' | 'admin';
    loginMethod: string;
  };
  demoCase: any | null;
  demoEvents: any[];
  demoCommunications: any[];
  demoDocuments: any[];
  demoAssignment: any | null;
  cases: any[];
  caseEvents: Record<number, any[]>;
  notifications: any[];
}

const STORAGE_KEY = 'lienguard_static_demo_v1';

function getDefaultState(): StaticDemoState {
  const dNow = new Date();
  const d1 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const d2 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const d3 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const d4 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
  const d5 = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  const initialCases = [
    {
      id: 101,
      caseId: 'LG-2026-A891F2C04D12',
      userId: 1,
      title: 'Unauthorized Cyber Cell Lien — P2P Escrow Account Freeze',
      description: 'Savings account frozen following an erroneous cybercrime complaint filed in Karnataka regarding a peer-to-peer escrow transaction. Notice issued under Section 91/102 CrPC.',
      caseType: 'CYBER_CRIME_LIEN',
      status: 'AWAITING_RESPONSE',
      priority: 'HIGH',
      bankName: 'HDFC Bank (Connaught Place Branch)',
      lienAmount: '85000.00',
      lienDate: d3.toISOString(),
      lienReference: 'LIEN-HDFC-2026-4491',
      transactionReference: 'TXN-UPI-992140581',
      authorityName: 'Karnataka State Cyber Crime Police Station (CID Bengaluru)',
      authorityEmail: 'cybercrime@ksp.gov.in',
      authorityDirectoryId: 17,
      responseDeadline: d5.toISOString(),
      createdAt: d3.toISOString(),
      updatedAt: d2.toISOString(),
    },
    {
      id: 102,
      caseId: 'LG-2026-B773E9A15C88',
      userId: 1,
      title: 'Merchant Gateway Chargeback Lien — Settlement Account Hold',
      description: 'Current account partial debit freeze of ₹2,40,000 imposed by nodal bank operations after fraudulent card chargeback claim from external payment aggregator.',
      caseType: 'BANK_INTERNAL_LIEN',
      status: 'UNDER_REVIEW',
      priority: 'NORMAL',
      bankName: 'State Bank of India (Corporate Centre, Mumbai)',
      lienAmount: '240000.00',
      lienDate: d4.toISOString(),
      lienReference: 'SBI-CR-2026-09214',
      transactionReference: 'PG-SETTLE-88102914',
      authorityName: 'Maharashtra Cyber Police Headquarters (World Trade Centre, Mumbai)',
      authorityEmail: 'sp.cbr-mah@gov.in',
      authorityDirectoryId: 21,
      responseDeadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: d4.toISOString(),
      updatedAt: d3.toISOString(),
    },
    {
      id: 103,
      caseId: 'LG-2026-C190D4F88B34',
      userId: 1,
      title: 'Erroneous Layer-3 Beneficiary Lien — Statutory Escalation',
      description: 'Salary account frozen as tertiary beneficiary in a multi-hop phishing scam trail. The citizen had no direct contact with the primary suspect. Statutory 48-hour response window elapsed without authority reply.',
      caseType: 'THIRD_PARTY_DISPUTE',
      status: 'ESCALATED',
      priority: 'URGENT',
      bankName: 'ICICI Bank (Bandra Kurla Complex)',
      lienAmount: '315000.00',
      lienDate: d1.toISOString(),
      lienReference: 'ICICI-LN-2026-78901',
      transactionReference: 'IMPS-REF-4091823',
      authorityName: 'Delhi Police Cyber Crime Unit (Special Cell IFSO)',
      authorityEmail: 'dcp-cybercell-dl@nic.in',
      authorityDirectoryId: 10,
      responseDeadline: d2.toISOString(),
      createdAt: d1.toISOString(),
      updatedAt: dNow.toISOString(),
    },
    {
      id: 104,
      caseId: 'LG-2026-D442A1E77E90',
      userId: 1,
      title: 'Mutual Fund Redemption Temporary Hold — Cleared & Unfrozen',
      description: 'Temporary administrative lien placed during high-value redemption verification. Cleared upon furnishing video KYC and bank mandate authentication.',
      caseType: 'BANK_INTERNAL_LIEN',
      status: 'RESOLVED',
      priority: 'LOW',
      bankName: 'Axis Bank (Retail Lending Operations)',
      lienAmount: '50000.00',
      lienDate: d1.toISOString(),
      lienReference: 'AXIS-REV-2026-1102',
      transactionReference: 'MF-RED-2026-77881',
      authorityName: 'Haryana State Cyber Crime Police Station (PHQ Panchkula)',
      authorityEmail: 'sp-cybercrimephq.pol@hry.gov.in',
      authorityDirectoryId: 12,
      responseDeadline: null,
      createdAt: d1.toISOString(),
      updatedAt: d3.toISOString(),
    },
  ];

  const initialCaseEvents: Record<number, any[]> = {
    101: [
      { id: 1, caseId: 101, actorUserId: 1, actorLabel: null, type: 'CASE_CREATED', message: 'Case registered by Citizen User.', createdAt: d3.toISOString() },
      { id: 2, caseId: 101, actorUserId: null, actorLabel: 'LienGuard automation', type: 'AUTHORITY_RECOMMENDED', message: 'Official Authority Recommended: Karnataka State Cyber Crime Police Station (CID Bengaluru) — Source: National Cyber Crime Reporting Portal', createdAt: d3.toISOString() },
      { id: 3, caseId: 101, actorUserId: null, actorLabel: 'LienGuard automation', type: 'AUTHORITY_ASSIGNED', message: 'Point-in-time statutory routing assigned to SP Cyber Crime CID Bengaluru.', createdAt: d3.toISOString() },
      { id: 4, caseId: 101, actorUserId: null, actorLabel: 'LienGuard Maileroo delivery', type: 'EMAIL_SENT', message: 'Formal representation and KYC validation documents dispatched via Maileroo SMTP to cybercrime@ksp.gov.in.', createdAt: d2.toISOString() },
    ],
    102: [
      { id: 5, caseId: 102, actorUserId: 1, actorLabel: null, type: 'CASE_CREATED', message: 'Merchant settlement account lien logged with proof of fulfillment.', createdAt: d4.toISOString() },
      { id: 6, caseId: 102, actorUserId: null, actorLabel: 'Maileroo inbound routing', type: 'INBOUND_EMAIL_RECEIVED', message: 'Acknowledgment receipt received from State Bank of India Nodal Desk.', createdAt: d3.toISOString() },
    ],
    103: [
      { id: 7, caseId: 103, actorUserId: 1, actorLabel: null, type: 'CASE_CREATED', message: 'Salary account freeze reported.', createdAt: d1.toISOString() },
      { id: 8, caseId: 103, actorUserId: null, actorLabel: 'LienGuard automation', type: 'DEADLINE_FOLLOW_UP_QUEUED', message: 'Automated 48-hour follow-up notice sent to Delhi Police IFSO Special Cell.', createdAt: d2.toISOString() },
      { id: 9, caseId: 103, actorUserId: null, actorLabel: 'LienGuard escalation', type: 'DEADLINE_ESCALATED', message: 'Statutory response window elapsed without reply. Case formally escalated to Supervisory Authority.', createdAt: d2.toISOString() },
      { id: 10, caseId: 103, actorUserId: 1, actorLabel: null, type: 'RTI_DRAFT_CREATED', message: 'Draft application under Section 6(1) Right to Information Act, 2005 generated.', createdAt: dNow.toISOString() },
    ],
    104: [
      { id: 11, caseId: 104, actorUserId: 1, actorLabel: null, type: 'CASE_CREATED', message: 'Mutual Fund redemption hold recorded.', createdAt: d1.toISOString() },
      { id: 12, caseId: 104, actorUserId: 1, actorLabel: null, type: 'DOCUMENT_UPLOADED', message: 'Video KYC verification certificate uploaded.', createdAt: d3.toISOString() },
      { id: 13, caseId: 104, actorUserId: 1, actorLabel: null, type: 'STATUS_CHANGED', message: 'Lien successfully revoked and account fully restored to normal status.', previousStatus: 'UNDER_REVIEW', nextStatus: 'RESOLVED', createdAt: d3.toISOString() },
    ],
  };

  return {
    user: {
      id: 1,
      openId: 'demo-citizen',
      name: 'Citizen User',
      email: 'citizen@lienguard.dev',
      role: 'citizen',
      loginMethod: 'demo_auth',
    },
    demoCase: null,
    demoEvents: [],
    demoCommunications: [],
    demoDocuments: [],
    demoAssignment: null,
    cases: initialCases,
    caseEvents: initialCaseEvents,
    notifications: [
      {
        id: 1,
        userId: 1,
        type: 'deadline_escalated',
        title: 'Case LG-2026-C190D4F88B34 Escalated',
        message: 'Statutory 48-hour response period elapsed. Case escalated to Delhi Police IFSO Supervisory Cell.',
        readAt: null,
        createdAt: d2.toISOString(),
      },
      {
        id: 2,
        userId: 1,
        type: 'status_changed',
        title: 'Case LG-2026-D442A1E77E90 Resolved',
        message: 'Mutual Fund redemption administrative hold has been cleared and lien released by Axis Bank.',
        readAt: d3.toISOString(),
        createdAt: d3.toISOString(),
      },
    ],
  };
}

function loadState(): StaticDemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const initial = getDefaultState();
  saveState(initial);
  return initial;
}

function saveState(state: StaticDemoState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function handleStaticTrpcRequest(path: string, input: any): any {
  const state = loadState();

  // 1. Auth routes
  if (path === 'auth.me') {
    return state.user;
  }
  if (path === 'auth.demoAvailable') {
    return true;
  }
  if (path === 'auth.demoLogin') {
    const role = input?.role || 'citizen';
    const roleNames: Record<string, string> = {
      citizen: 'Citizen User',
      bank: 'Nodal Bank Officer',
      authority: 'Designated Police Authority',
      admin: 'LienGuard Administrator',
    };
    state.user = {
      id: 1,
      openId: 'demo-' + role,
      name: roleNames[role] || 'LienGuard User',
      email: role + '@lienguard.dev',
      role: role as any,
      loginMethod: 'demo_auth',
    };
    saveState(state);
    return state.user;
  }
  if (path === 'auth.logout') {
    return { success: true };
  }

  // 2. Demo routes
  if (path === 'demo.isDemo') {
    return true;
  }
  if (path === 'demo.getState') {
    if (!state.demoCase) {
      return {
        hasCase: false,
        case: null,
        events: [],
        communications: [],
        documents: [],
        latestAssignment: null,
        step: 0,
        emailDeliveryMode: 'demo',
        demoRecipients: ['demo-authority@local.invalid'],
        isMailerooConfigured: true,
      };
    }

    let step = 1;
    const hasFollowUp = state.demoCommunications.some(c => c.subject.includes('Follow-up') || c.subject.includes('Formal Status'));
    const hasBankEscalation = state.demoCommunications.some(c => c.subject.includes('Nodal Bank Escalation'));
    const hasCyberEscalation = state.demoCommunications.some(c => c.subject.includes('Cybercrime Authority Escalation')) || state.demoCase.status === 'ESCALATED';
    const hasRtiDraft = state.demoDocuments.some(d => d.kind === 'RTI_DRAFT');

    if (hasFollowUp) step = 2;
    if (hasBankEscalation) step = 3;
    if (hasCyberEscalation) step = 4;
    if (hasRtiDraft) step = 5;

    const latestInbound = state.demoCommunications.find(c => c.direction === 'inbound' || c.state === 'received');
    const latestInboundAnalysis = latestInbound
      ? {
          intent: 'REQUESTING_DOCUMENTS',
          urgency: 'MEDIUM',
          confidence: 0.95,
          summary: 'Authority acknowledges dispute and requests certified KYC + bank transaction statement for account unfreezing.',
          actionItems: ['Provide certified bank mandate', 'Submit P2P transaction log'],
          reasoning: 'Inbound official response from Investigating Officer requesting verification documents.',
        }
      : null;

    return {
      hasCase: true,
      case: state.demoCase,
      events: state.demoEvents,
      communications: state.demoCommunications,
      documents: state.demoDocuments,
      latestAssignment: state.demoAssignment,
      step,
      latestInboundAnalysis,
      emailDeliveryMode: 'demo',
      demoRecipients: ['demo-authority@local.invalid'],
      isMailerooConfigured: true,
    };
  }

  if (path === 'demo.registerDemoCase') {
    const caseId = 'LG-2026-' + Math.random().toString(36).substring(2, 14).toUpperCase();
    const now = new Date().toISOString();
    const haryana = OFFICIAL_CYBER_AUTHORITIES.find(a => a.stateUt === 'Haryana') || OFFICIAL_CYBER_AUTHORITIES[11];

    const demoCase = {
      id: 999,
      caseId,
      userId: state.user.id,
      title: '[HACKATHON DEMO] Unauthorized Bank Account Lien — Case Investigation',
      description: 'Fictional cybercrime investigation lien placed on primary checking account following simulated suspicious P2P transfer report. Demo case for hackathon judges.',
      caseType: 'CYBER_CRIME_LIEN',
      status: 'AWAITING_RESPONSE',
      priority: 'HIGH',
      bankName: 'Demo National Bank (Nodal Operations)',
      lienAmount: '150000.00',
      lienDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      lienReference: 'LIEN-DEMO-2026-9812',
      transactionReference: 'TXN-DEMO-88492014',
      authorityName: haryana.authorityName,
      authorityEmail: haryana.officialEmail || 'sp-cybercrimephq.pol@hry.gov.in',
      authorityDirectoryId: 12,
      responseDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    const demoAssignment = {
      id: 999,
      caseId: 999,
      authorityDirectoryId: 12,
      authorityName: haryana.authorityName,
      authorityEmail: haryana.officialEmail,
      officerName: haryana.officerName,
      designation: haryana.designation,
      sourceName: haryana.sourceName,
      sourceUrl: haryana.sourceUrl,
      lastVerifiedAt: new Date('2026-08-23').toISOString(),
      routingReason: 'Deterministic match: State/UT = Haryana, Category = Cyber Crime Lien',
      assignedByUserId: state.user.id,
      assignedAt: now,
    };

    const demoEvents = [
      { id: 1, caseId: 999, actorUserId: state.user.id, actorLabel: null, type: 'CASE_CREATED', message: 'Case registered by Citizen User.', createdAt: now },
      { id: 2, caseId: 999, actorUserId: null, actorLabel: 'LienGuard automation', type: 'AUTHORITY_RECOMMENDED', message: 'Official Authority Recommended: ' + haryana.authorityName + ' — Source: National Cyber Crime Reporting Portal', createdAt: now },
      { id: 3, caseId: 999, actorUserId: null, actorLabel: 'LienGuard automation', type: 'AUTHORITY_ASSIGNED', message: 'Official Authority Assigned: ' + haryana.authorityName + ' — Officer: ' + haryana.officerName + ' (' + haryana.designation + ')', createdAt: now },
    ];

    state.demoCase = demoCase;
    state.demoAssignment = demoAssignment;
    state.demoEvents = demoEvents;
    state.demoCommunications = [];
    state.demoDocuments = [];

    // Also add to global cases list so it shows in /cases
    state.cases = [demoCase, ...state.cases.filter(c => c.id !== 999)];
    state.caseEvents[999] = demoEvents;

    saveState(state);
    return { success: true, case: demoCase };
  }

  if (path === 'demo.sendFollowUp') {
    const now = new Date().toISOString();
    const comm = {
      id: state.demoCommunications.length + 1,
      caseId: state.demoCase.id,
      direction: 'outbound',
      subject: '[' + state.demoCase.caseId + '] [HACKATHON DEMO] Formal Status Follow-up on Lien Freezing Order',
      counterparty: state.demoCase.authorityName,
      recipientEmail: state.demoCase.authorityEmail,
      body: 'Formal recorded status follow-up dispatched via Maileroo SMTP.',
      state: 'sent',
      providerMessageId: 'msg_maileroo_' + Math.random().toString(36).slice(2, 10),
      sentAt: now,
      deliveredAt: now,
      automated: 1,
      createdAt: now,
      updatedAt: now,
    };
    state.demoCommunications.push(comm);
    state.demoEvents.push({
      id: state.demoEvents.length + 1,
      caseId: state.demoCase.id,
      actorUserId: state.user.id,
      actorLabel: 'LienGuard Maileroo delivery',
      type: 'EMAIL_SENT',
      message: 'Follow-up email dispatched via Maileroo SMTP to ' + state.demoCase.authorityEmail + ' (ID: ' + comm.providerMessageId + ').',
      createdAt: now,
    });
    state.caseEvents[999] = state.demoEvents;
    saveState(state);
    return {
      success: true,
      delivery: { state: 'sent', communicationId: comm.id, providerMessageId: comm.providerMessageId },
      providerMessageId: comm.providerMessageId,
      case: state.demoCase,
    };
  }

  if (path === 'demo.escalateToBank') {
    const now = new Date().toISOString();
    state.demoCase.status = 'UNDER_REVIEW';
    state.demoCase.updatedAt = now;

    const comm = {
      id: state.demoCommunications.length + 1,
      caseId: state.demoCase.id,
      direction: 'outbound',
      subject: '[' + state.demoCase.caseId + '] [HACKATHON DEMO] Urgent Nodal Bank Escalation: Non-Compliance Review',
      counterparty: 'Nodal Bank Compliance Desk',
      recipientEmail: 'nodal.compliance@demobank.invalid',
      body: 'Statutory non-compliance escalation notice dispatched to Nodal Bank Officer.',
      state: 'sent',
      providerMessageId: 'msg_bank_esc_' + Math.random().toString(36).slice(2, 10),
      sentAt: now,
      deliveredAt: now,
      automated: 1,
      createdAt: now,
      updatedAt: now,
    };
    state.demoCommunications.push(comm);
    state.demoEvents.push({
      id: state.demoEvents.length + 1,
      caseId: state.demoCase.id,
      actorUserId: null,
      actorLabel: 'LienGuard Escalation Engine',
      type: 'DEADLINE_FOLLOW_UP_QUEUED',
      message: 'Nodal bank escalation notice queued for portfolio compliance audit.',
      createdAt: now,
    });
    state.caseEvents[999] = state.demoEvents;
    saveState(state);
    return {
      success: true,
      delivery: { state: 'sent', communicationId: comm.id, providerMessageId: comm.providerMessageId },
      providerMessageId: comm.providerMessageId,
      case: state.demoCase,
    };
  }

  if (path === 'demo.escalateToCybercrime') {
    const now = new Date().toISOString();
    state.demoCase.status = 'ESCALATED';
    state.demoCase.updatedAt = now;

    const comm = {
      id: state.demoCommunications.length + 1,
      caseId: state.demoCase.id,
      direction: 'outbound',
      subject: '[' + state.demoCase.caseId + '] [HACKATHON DEMO] Cybercrime Authority Escalation: Statutory Period Elapsed',
      counterparty: 'Cyber Crime Investigation Cell (Supervisory Desk)',
      recipientEmail: state.demoCase.authorityEmail,
      body: 'Formal Tier-2 escalation notice dispatched following expiry of statutory response window.',
      state: 'sent',
      providerMessageId: 'msg_cyber_esc_' + Math.random().toString(36).slice(2, 10),
      sentAt: now,
      deliveredAt: now,
      automated: 1,
      createdAt: now,
      updatedAt: now,
    };
    state.demoCommunications.push(comm);
    state.demoEvents.push({
      id: state.demoEvents.length + 1,
      caseId: state.demoCase.id,
      actorUserId: null,
      actorLabel: 'LienGuard Escalation Engine',
      type: 'DEADLINE_ESCALATED',
      message: 'Statutory grace period elapsed. Case escalated to Cyber Crime Cell supervisory authority.',
      createdAt: now,
    });
    state.caseEvents[999] = state.demoEvents;
    saveState(state);
    return {
      success: true,
      delivery: { state: 'sent', communicationId: comm.id, providerMessageId: comm.providerMessageId },
      providerMessageId: comm.providerMessageId,
      case: state.demoCase,
    };
  }

  if (path === 'demo.generateRtiDraft') {
    const now = new Date().toISOString();
    const fileName = state.demoCase.caseId + '-rti-draft.txt';
    const content = [
      'APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005',
      '====================================================================',
      '',
      'To:',
      'The Central Public Information Officer (CPIO) / Public Information Officer,',
      'Office of the Superintendent of Police / Cyber Crime Investigation Cell.',
      '',
      'Subject: Request for Information regarding Bank Lien / Freezing Order on Case ' + state.demoCase.caseId,
      '',
      '1. PARTICULARS OF THE APPLICANT:',
      '   Name: ' + state.user.name,
      '   Email: ' + state.user.email,
      '',
      '2. PARTICULARS OF THE INFORMATION SOUGHT:',
      '   a) Copy of the formal police requisition / notice issued under Section 91 / 102 CrPC pertaining to Lien Reference: ' + (state.demoCase.lienReference || 'LIEN-DEMO-2026-9812') + '.',
      '   b) Date of complaint registration, FIR/NCR number, and current investigative stage of the associated matter.',
      '   c) Reasons recorded in writing for freezing the lien amount of INR ' + state.demoCase.lienAmount + ' on account.',
      '   d) Name and designation of the Investigating Officer (IO) assigned to the case.',
      '   e) Expected timeline for submitting clearance report / NOC to the bank.',
      '',
      '3. DECLARATION:',
      '   The applicant is a citizen of India and the information sought is within the purview of the RTI Act, 2005.',
      '',
      '*** REVIEW-ONLY DRAFT — NOT SUBMITTED AUTOMATICALLY ***',
    ].join('\n');

    const doc = {
      id: state.demoDocuments.length + 1,
      caseId: state.demoCase.id,
      uploadedByUserId: state.user.id,
      kind: 'RTI_DRAFT',
      fileName,
      storageKey: 'lienguard/cases/' + state.demoCase.id + '/rti/' + fileName,
      contentType: 'text/plain',
      sizeBytes: content.length,
      createdAt: now,
      updatedAt: now,
    };

    state.demoDocuments.push(doc);
    state.demoEvents.push({
      id: state.demoEvents.length + 1,
      caseId: state.demoCase.id,
      actorUserId: state.user.id,
      actorLabel: null,
      type: 'RTI_DRAFT_CREATED',
      message: 'RTI draft generated for escalated case ' + state.demoCase.caseId + '. Saved for manual legal review.',
      createdAt: now,
    });
    state.caseEvents[999] = state.demoEvents;
    saveState(state);
    return {
      success: true,
      content,
      documentId: doc.id,
      case: state.demoCase,
    };
  }

  if (path === 'demo.simulateInboundReply') {
    const now = new Date().toISOString();
    const comm = {
      id: state.demoCommunications.length + 1,
      caseId: state.demoCase.id,
      direction: 'inbound',
      subject: 'RE: [' + state.demoCase.caseId + '] Authority Inquiry Response',
      counterparty: state.demoCase.authorityEmail,
      recipientEmail: state.demoCase.authorityEmail,
      body: input?.body || ('[SIMULATED AUTHORITY REPLY] We have received your submission regarding case ' + state.demoCase.caseId + '. Please furnish the certified bank transaction log and KYC certificate for clearance review.'),
      state: 'received',
      providerMessageId: 'inbound_sim_' + Math.random().toString(36).slice(2, 10),
      sentAt: null,
      deliveredAt: now,
      automated: 0,
      createdAt: now,
      updatedAt: now,
    };
    state.demoCommunications.push(comm);
    state.demoEvents.push({
      id: state.demoEvents.length + 1,
      caseId: state.demoCase.id,
      actorUserId: null,
      actorLabel: 'Maileroo inbound routing',
      type: 'INBOUND_EMAIL_RECEIVED',
      message: 'Inbound email received from ' + state.demoCase.authorityEmail + '. AI Reply Analysis: REQUESTING_DOCUMENTS.',
      createdAt: now,
    });
    state.caseEvents[999] = state.demoEvents;
    state.notifications.unshift({
      id: state.notifications.length + 1,
      userId: state.user.id,
      type: 'inbound_reply',
      title: 'Action Required: Documents requested for ' + state.demoCase.caseId,
      message: state.demoCase.authorityEmail + ': Provide certified bank mandate and transaction logs.',
      readAt: null,
      createdAt: now,
    });
    saveState(state);
    return {
      success: true,
      caseId: state.demoCase.caseId,
      duplicate: false,
      communication: comm,
      analysis: {
        intent: 'REQUESTING_DOCUMENTS',
        urgency: 'MEDIUM',
        confidence: 0.95,
        summary: 'Authority acknowledges dispute and requests certified KYC + bank transaction statement for account unfreezing.',
        actionItems: ['Provide certified bank mandate', 'Submit P2P transaction log'],
        reasoning: 'Inbound official response from Investigating Officer requesting verification documents.',
      },
    };
  }

  if (path === 'demo.resetDemo') {
    state.demoCase = null;
    state.demoEvents = [];
    state.demoCommunications = [];
    state.demoDocuments = [];
    state.demoAssignment = null;
    state.cases = state.cases.filter(c => c.id !== 999);
    delete state.caseEvents[999];
    saveState(state);
    return { success: true, count: 1 };
  }

  // 3. Cases routes
  if (path === 'cases.list') {
    return state.cases;
  }
  if (path === 'cases.get') {
    const c = state.cases.find(x => x.caseId === input?.caseId);
    return c || state.cases[0];
  }
  if (path === 'cases.detail') {
    const c = state.cases.find(x => x.caseId === input?.caseId) || state.demoCase || state.cases[0];
    const events = (c.id === 999 ? state.demoEvents : state.caseEvents[c.id]) || [];
    
    let health = 'ON_TRACK';
    if (c.status === 'RESOLVED') health = 'RESOLVED';
    else if (c.status === 'ESCALATED') health = 'ESCALATION_REQUIRED';
    else if (c.status === 'UNDER_REVIEW') health = 'UNDER_REVIEW';
    else if (c.status === 'AWAITING_RESPONSE') health = 'RESPONSE_PENDING';

    const timeline = events.map(e => ({
      id: 'event-' + e.id,
      title: e.type.replace(/_/g, ' '),
      detail: e.message,
      occurredAt: new Date(e.createdAt),
      tone: e.type.includes('ESCALATED') ? 'danger' : e.type.includes('RESOLVED') || e.type.includes('SENT') ? 'success' : 'active',
    }));

    return {
      case: c,
      health,
      timeline,
    };
  }
  if (path === 'cases.create') {
    const caseId = 'LG-2026-' + Math.random().toString(36).substring(2, 14).toUpperCase();
    const now = new Date().toISOString();
    const newCase = {
      id: state.cases.length + 100,
      caseId,
      userId: state.user.id,
      title: input.title,
      description: input.description,
      caseType: input.caseType,
      status: 'OPEN',
      priority: input.priority || 'NORMAL',
      bankName: input.bankName || null,
      lienAmount: input.lienAmount || null,
      lienDate: input.lienDate ? new Date(input.lienDate).toISOString() : null,
      lienReference: input.lienReference || null,
      transactionReference: input.transactionReference || null,
      authorityName: input.authorityName || null,
      authorityEmail: input.authorityEmail || null,
      responseDeadline: input.responseDeadline ? new Date(input.responseDeadline).toISOString() : null,
      createdAt: now,
      updatedAt: now,
    };
    state.cases.unshift(newCase);
    state.caseEvents[newCase.id] = [
      { id: 1, caseId: newCase.id, actorUserId: state.user.id, type: 'CASE_CREATED', message: 'Case registered by User.', createdAt: now },
    ];
    saveState(state);
    return newCase;
  }

  // 4. Authority directory
  if (path === 'authorityDirectory.browse' || path === 'authorityDirectory.search') {
    let list = OFFICIAL_CYBER_AUTHORITIES.map((a, idx) => ({
      id: idx + 1,
      stateUt: a.stateUt,
      district: null,
      authorityType: a.authorityType,
      authorityName: a.authorityName,
      officerName: a.officerName || null,
      designation: a.designation || null,
      officialEmail: a.officialEmail || null,
      phone: a.phone || null,
      sourceName: a.sourceName,
      sourceUrl: a.sourceUrl,
      lastVerifiedAt: a.lastVerifiedAt,
      active: 1,
    }));
    if (input?.search) {
      const q = input.search.toLowerCase();
      list = list.filter(a => a.stateUt.toLowerCase().includes(q) || a.authorityName.toLowerCase().includes(q) || (a.officerName && a.officerName.toLowerCase().includes(q)));
    }
    if (input?.stateUt) {
      list = list.filter(a => a.stateUt.toLowerCase().includes(input.stateUt.toLowerCase()));
    }
    return list;
  }

  // 5. Notifications
  if (path === 'notifications.list') {
    return state.notifications;
  }
  if (path === 'notifications.markRead') {
    state.notifications.forEach(n => { n.readAt = new Date().toISOString(); });
    saveState(state);
    return { changed: true };
  }

  return null;
};
