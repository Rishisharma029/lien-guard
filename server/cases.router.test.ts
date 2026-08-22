import { describe, expect, it, vi } from "vitest";

const caseState = vi.hoisted(() => ({
  currentCase: {
    id: 1,
    caseId: "LG-CYB-1024",
    userId: 4,
    title: "Lien on SBI account",
    description: "Account frozen due to cybercrime inquiry.",
    caseType: "Cybercrime Bank Lien",
    status: "OPEN" as const,
    priority: "NORMAL" as const,
    bankName: "State Bank of India",
    accountNumber: "30891234567",
    branchName: "Main Branch",
    ifscCode: "SBIN0000691",
    lienAmount: "15000",
    disputeRefNumber: "DISP-9921",
    ncrpAckNumber: "20261930018241",
    firNumber: "FIR 42/2026",
    freezingAuthority: "Delhi Cyber Police",
    authorityEmail: "cybercell@delhipolice.gov.in",
    nodalOfficerEmail: "nodal@sbi.co.in",
    noticeSentAt: null,
    responseDeadline: null,
    reminderCount: 0,
    escalationTier: 1,
    resolutionNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  updateCaseDetails: vi.fn(),
  setCaseStatus: vi.fn(),
  dispatchInitialNotice: vi.fn(),
  dispatchFollowUpReminder: vi.fn(),
  dispatchEscalation: vi.fn(),
  recordInboundResponse: vi.fn(),
  generateOrUpdateRtiDraft: vi.fn(),
  getDashboardMetrics: vi.fn(),
}));

vi.mock("./db", () => ({
  changeUserRoleWithAudit: vi.fn(),
  createCase: vi.fn(async (input: any) => ({ ...caseState.currentCase, ...input, caseId: "LG-CYB-1024" })),
  getCaseByReference: vi.fn(async () => caseState.currentCase),
  getCaseWithDetails: vi.fn(async () => ({
    caseRecord: caseState.currentCase,
    timelineEvents: [
      {
        id: 1,
        caseId: "LG-CYB-1024",
        eventType: "CASE_REGISTERED",
        title: "Case Registered",
        description: "Case recorded",
        actorRole: "citizen",
        createdAt: new Date(),
      },
    ],
    communications: [],
    rtiDraft: undefined,
  })),
  getNotificationsForUser: vi.fn(async () => []),
  getRoleChangeAudits: vi.fn(async () => []),
  listCasesForUser: vi.fn(async () => [caseState.currentCase]),
  listUsersForAdmin: vi.fn(async () => []),
  markNotificationRead: vi.fn(async () => true),
  setCaseStatus: caseState.setCaseStatus,
  updateCaseDetails: caseState.updateCaseDetails,
  dispatchInitialNotice: caseState.dispatchInitialNotice,
  dispatchFollowUpReminder: caseState.dispatchFollowUpReminder,
  dispatchEscalation: caseState.dispatchEscalation,
  recordInboundResponse: caseState.recordInboundResponse,
  generateOrUpdateRtiDraft: caseState.generateOrUpdateRtiDraft,
  getDashboardMetrics: caseState.getDashboardMetrics,
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { LienGuardRole } from "../drizzle/schema";

function createContext(role: LienGuardRole, userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `${role}-${userId}`,
      email: `${role}-${userId}@example.com`,
      name: `${role} test user`,
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("LienGuard Case Lifecycle and Operations", () => {
  it("registers a case with bank lien details, amount, and cybercrime refs", async () => {
    const caller = appRouter.createCaller(createContext("citizen", 4));
    const created = await caller.cases.create({
      title: "Unauthorized freeze on savings account",
      description: "Received bank SMS stating ₹15,000 lien marked by cyber police.",
      caseType: "Cybercrime Bank Lien",
      bankName: "State Bank of India",
      accountNumber: "30891234567",
      lienAmount: "15000",
      ncrpAckNumber: "20261930018241",
      freezingAuthority: "Delhi Cyber Cell",
    });

    expect(created).toMatchObject({
      caseId: "LG-CYB-1024",
      bankName: "State Bank of India",
      lienAmount: "15000",
    });
  });

  it("retrieves detailed case dossier including timeline and communications", async () => {
    const citizen = appRouter.createCaller(createContext("citizen", 4));
    const details = await citizen.cases.getDetailed({ caseId: "LG-CYB-1024" });

    expect(details.caseRecord).toMatchObject({ caseId: "LG-CYB-1024" });
    expect(details.timelineEvents).toHaveLength(1);
    expect(details.timelineEvents[0].eventType).toBe("CASE_REGISTERED");
  });

  it("dispatches initial official notice to bank and investigating authority", async () => {
    caseState.dispatchInitialNotice.mockResolvedValueOnce({
      caseRecord: { ...caseState.currentCase, status: "AWAITING_RESPONSE" },
      timelineEvents: [],
      communications: [],
    });

    const citizen = appRouter.createCaller(createContext("citizen", 4));
    const result = await citizen.cases.sendInitialNotice({ caseId: "LG-CYB-1024" });

    expect(caseState.dispatchInitialNotice).toHaveBeenCalledWith({
      caseId: "LG-CYB-1024",
      citizenName: "citizen test user",
      citizenEmail: "citizen-4@example.com",
      actorRole: "citizen",
    });
    expect(result.caseRecord.status).toBe("AWAITING_RESPONSE");
  });

  it("triggers follow-up reminder when response is pending", async () => {
    caseState.dispatchFollowUpReminder.mockResolvedValueOnce({
      caseRecord: { ...caseState.currentCase, status: "REMINDER_SENT", reminderCount: 1 },
      timelineEvents: [],
      communications: [],
    });

    const citizen = appRouter.createCaller(createContext("citizen", 4));
    const result = await citizen.cases.sendFollowUpReminder({ caseId: "LG-CYB-1024" });

    expect(caseState.dispatchFollowUpReminder).toHaveBeenCalledWith({
      caseId: "LG-CYB-1024",
      citizenName: "citizen test user",
      actorRole: "citizen",
    });
    expect(result.caseRecord.reminderCount).toBe(1);
  });

  it("escalates case to Tier 2 (Principal Nodal Officer / SP) or Tier 3 (Ombudsman)", async () => {
    caseState.dispatchEscalation.mockResolvedValueOnce({
      caseRecord: { ...caseState.currentCase, status: "ESCALATED", escalationTier: 2 },
      timelineEvents: [],
      communications: [],
    });

    const citizen = appRouter.createCaller(createContext("citizen", 4));
    const result = await citizen.cases.escalate({ caseId: "LG-CYB-1024", tier: 2 });

    expect(caseState.dispatchEscalation).toHaveBeenCalledWith({
      caseId: "LG-CYB-1024",
      citizenName: "citizen test user",
      tier: 2,
      actorRole: "citizen",
    });
    expect(result.caseRecord.escalationTier).toBe(2);
  });

  it("records inbound response from authority and updates case status", async () => {
    caseState.recordInboundResponse.mockResolvedValueOnce({
      caseRecord: { ...caseState.currentCase, status: "UNDER_REVIEW" },
      timelineEvents: [],
      communications: [],
    });

    const citizen = appRouter.createCaller(createContext("citizen", 4));
    const result = await citizen.cases.recordResponse({
      caseId: "LG-CYB-1024",
      sender: "branch.mgr@sbi.co.in",
      subject: "In reply to Ref: LG-CYB-1024",
      body: "We have forwarded the requisition to the nodal cyber division.",
      nextStatus: "UNDER_REVIEW",
    });

    expect(caseState.recordInboundResponse).toHaveBeenCalled();
    expect(result.caseRecord.status).toBe("UNDER_REVIEW");
  });

  it("generates Section 6(1) RTI application draft", async () => {
    caseState.generateOrUpdateRtiDraft.mockResolvedValueOnce({
      id: 1,
      caseId: "LG-CYB-1024",
      publicAuthority: "Delhi Cyber Police",
      pioDesignation: "The Public Information Officer",
      factsSummary: "Applicant account frozen for ₹15,000.",
      queriesRequested: "1. Certified copy of order under Sec 102 CrPC.",
      statutoryDeclaration: "Citizen of India",
    });

    const citizen = appRouter.createCaller(createContext("citizen", 4));
    const draft = await citizen.cases.generateRtiDraft({ caseId: "LG-CYB-1024" });

    expect(caseState.generateOrUpdateRtiDraft).toHaveBeenCalled();
    expect(draft).toMatchObject({
      publicAuthority: "Delhi Cyber Police",
    });
  });

  it("returns dashboard metrics for the citizen workspace", async () => {
    caseState.getDashboardMetrics.mockResolvedValueOnce({
      totalCases: 2,
      activeCases: 2,
      awaitingResponse: 1,
      overdueDeadlines: 0,
      escalatedCases: 0,
      resolvedCases: 0,
      totalFrozenAmount: 30000,
    });

    const citizen = appRouter.createCaller(createContext("citizen", 4));
    const metrics = await citizen.cases.metrics();

    expect(metrics.totalFrozenAmount).toBe(30000);
    expect(metrics.activeCases).toBe(2);
  });
});

