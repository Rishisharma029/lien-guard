import { describe, expect, it, vi } from "vitest";
import { createEmailDeliveryGuard } from "./_core/env";
import { createCaseReference } from "./db";

const demoState = vi.hoisted(() => ({
  demoCase: null as any,
  events: [] as any[],
  communications: [] as any[],
  documents: [] as any[],
}));

vi.mock("./db", () => ({
  createCaseReference: () => "LG-2026-ABCDEF123456",
  getLatestDemoCase: vi.fn(async () => demoState.demoCase),
  listCaseEvents: vi.fn(async () => demoState.events),
  listCaseCommunications: vi.fn(async () => demoState.communications),
  listCaseDocuments: vi.fn(async () => demoState.documents),
  getCaseByReference: vi.fn(async (caseId: string) => {
    if (demoState.demoCase && demoState.demoCase.caseId === caseId) {
      return demoState.demoCase;
    }
    return undefined;
  }),
  createCase: vi.fn(async (input: any) => {
    demoState.demoCase = {
      id: 101,
      caseId: "LG-2026-ABCDEF123456",
      userId: input.userId,
      title: input.title,
      description: input.description,
      caseType: input.caseType,
      priority: input.priority,
      bankName: input.bankName,
      lienAmount: input.lienAmount,
      lienDate: input.lienDate,
      lienReference: input.lienReference,
      transactionReference: input.transactionReference,
      authorityName: input.authorityName,
      authorityEmail: input.authorityEmail,
      responseDeadline: input.responseDeadline,
      status: input.initialStatus || "OPEN",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    demoState.events.push({
      id: 1,
      caseId: 101,
      type: "CASE_CREATED",
      message: "Case record created.",
      createdAt: new Date(),
    });
    return demoState.demoCase;
  }),
  createOutboundEmail: vi.fn(async (input: any) => {
    const comm = {
      id: demoState.communications.length + 1,
      caseId: input.caseRecordId,
      recipientEmail: input.recipientEmail,
      subject: input.subject,
      body: input.body,
      state: "queued",
      createdAt: new Date(),
    };
    demoState.communications.push(comm);
    return comm;
  }),
  setCaseStatus: vi.fn(async (input: any) => {
    if (demoState.demoCase) {
      demoState.demoCase.status = input.nextStatus;
      demoState.events.push({
        id: demoState.events.length + 1,
        caseId: demoState.demoCase.id,
        type: "STATUS_CHANGED",
        message: `Status changed to ${input.nextStatus}`,
        createdAt: new Date(),
      });
    }
    return demoState.demoCase;
  }),
  recordSystemCaseEvent: vi.fn(async (input: any) => {
    const ev = {
      id: demoState.events.length + 1,
      caseId: input.caseRecordId,
      type: input.type,
      message: input.message,
      actorLabel: input.actorLabel,
      createdAt: new Date(),
    };
    demoState.events.push(ev);
    return ev;
  }),
  createCaseDocument: vi.fn(async (input: any) => {
    const doc = {
      id: demoState.documents.length + 1,
      caseId: input.caseRecordId,
      kind: input.kind,
      fileName: input.fileName,
      storageKey: input.storageKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      createdAt: new Date(),
    };
    demoState.documents.push(doc);
    if (input.eventType) {
      demoState.events.push({
        id: demoState.events.length + 1,
        caseId: input.caseRecordId,
        type: input.eventType,
        message: input.eventMessage || "Document recorded.",
        createdAt: new Date(),
      });
    }
    return doc;
  }),
  purgeDemoCases: vi.fn(async () => {
    const count = demoState.demoCase ? 1 : 0;
    demoState.demoCase = null;
    demoState.events = [];
    demoState.communications = [];
    demoState.documents = [];
    return count;
  }),
  changeUserRoleWithAudit: vi.fn(),
  getNotificationsForUser: vi.fn(async () => []),
  getRoleChangeAudits: vi.fn(async () => []),
  listCasesForUser: vi.fn(async () => []),
  listUsersForAdmin: vi.fn(async () => []),
  markNotificationRead: vi.fn(async () => true),
  recordCaseFollowUp: vi.fn(),
  recordInboundEmail: vi.fn(),
  updateCaseDetails: vi.fn(),
  upsertUser: vi.fn(),
  findActiveAuthorityForRouting: vi.fn(async () => ({
    id: 12,
    stateUt: "Haryana",
    authorityType: "CYBER_CELL",
    authorityName: "Haryana State Cyber Crime Police Station (PHQ Panchkula)",
    officerName: "Sh. Sibash Kabiraj",
    designation: "IPS, ADGP Cyber Haryana",
    officialEmail: "sp-cybercrimephq.pol@hry.gov.in",
    phone: "0172-2524058",
    sourceName: "National Cyber Crime Reporting Portal",
    sourceUrl: "https://cybercrime.gov.in/",
    lastVerifiedAt: new Date("2026-08-23"),
    active: 1,
  })),
  recordAuthorityAssignment: vi.fn(async (input: any) => ({
    id: 1,
    ...input,
    assignedAt: new Date(),
  })),
  getLatestAuthorityAssignment: vi.fn(async () => ({
    id: 1,
    authorityName: "Haryana State Cyber Crime Police Station (PHQ Panchkula)",
    officerName: "Sh. Sibash Kabiraj",
    designation: "IPS, ADGP Cyber Haryana",
    sourceName: "National Cyber Crime Reporting Portal",
    lastVerifiedAt: new Date("2026-08-23"),
  })),
  updateCaseAuthorityDirectoryId: vi.fn(async () => {}),
  listAuthorityDirectory: vi.fn(async () => []),
  getAuthorityById: vi.fn(async () => undefined),
  createAuthorityRecord: vi.fn(),
  updateAuthorityRecord: vi.fn(),
}));

vi.mock("./automation", () => ({
  deliverQueuedCommunication: vi.fn(async (comm: any) => ({
    state: "sent",
    communicationId: comm.id,
    providerMessageId: "maileroo-msg-test-123",
  })),
  runDeadlineAutomation: vi.fn(async () => ({ actions: [] })),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(async (key: string) => ({ key, url: `https://storage.local/${key}` })),
  storageGetSignedUrl: vi.fn(async (key: string) => `https://storage.local/${key}`),
}));

import { appRouter } from "./routers";

function createCaller(user: { id: number; role: "citizen" | "bank" | "authority" | "admin"; openId: string; name: string; email: string }) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: {} } as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  });
}

describe("Hackathon Demo Mode Workflow & Safety", () => {
  const citizenUser = {
    id: 1,
    role: "citizen" as const,
    openId: "demo-citizen",
    name: "Demo Citizen",
    email: "citizen@lienguard.dev",
  };

  const caller = createCaller(citizenUser);

  it("identifies demo mode availability", async () => {
    const isDemo = await caller.demo.isDemo();
    expect(typeof isDemo).toBe("boolean");
  });

  it("generates structured case references matching LG-YYYY-XXXXXXXXXXXX", () => {
    const ref = createCaseReference();
    expect(ref).toMatch(/^LG-\d{4}-[A-Z0-9]{12}$/);
  });

  it("enforces demo email allowlist restrictions", () => {
    const guard = createEmailDeliveryGuard("demo", "judges@hackathon.dev,developer@lienguard.dev");
    expect(guard.isRecipientAllowed("judges@hackathon.dev")).toBe(true);
    expect(guard.isRecipientAllowed("developer@lienguard.dev")).toBe(true);
    expect(guard.isRecipientAllowed("victim@bank.com")).toBe(false);
    expect(guard.isRecipientAllowed("cybercrime@police.gov.in")).toBe(false);
  });

  it("executes the full demo lifecycle in sequence", async () => {
    // 1. Reset demo to clean initial state
    const resetResult = await caller.demo.resetDemo();
    expect(resetResult.success).toBe(true);

    // 2. Query initial state (no demo case)
    const initialState = await caller.demo.getState();
    expect(initialState.hasCase).toBe(false);
    expect(initialState.step).toBe(0);

    // 3. Register demo case
    const registerResult = await caller.demo.registerDemoCase();
    expect(registerResult.success).toBe(true);
    expect(registerResult.case.caseId).toMatch(/^LG-\d{4}-[A-Z0-9]{12}$/);
    expect(registerResult.case.title).toContain("[HACKATHON DEMO]");
    expect(registerResult.case.status).toBe("AWAITING_RESPONSE");

    const caseId = registerResult.case.caseId;

    // 4. Query state after registration
    const registeredState = await caller.demo.getState();
    expect(registeredState.hasCase).toBe(true);
    expect(registeredState.case?.caseId).toBe(caseId);
    expect(registeredState.events.some(e => e.type === "CASE_CREATED")).toBe(true);
    expect(registeredState.step).toBe(1);

    // 5. Send authority follow-up
    const followUpResult = await caller.demo.sendFollowUp({ caseId });
    expect(followUpResult.success).toBe(true);

    const followUpState = await caller.demo.getState();
    expect(followUpState.step).toBeGreaterThanOrEqual(2);
    expect(followUpState.communications.length).toBeGreaterThanOrEqual(1);

    // 6. Escalate to Bank
    const bankResult = await caller.demo.escalateToBank({ caseId });
    expect(bankResult.success).toBe(true);
    expect(bankResult.case?.status).toBe("UNDER_REVIEW");

    const bankState = await caller.demo.getState();
    expect(bankState.step).toBeGreaterThanOrEqual(3);

    // 7. Attempt RTI draft before ESCALATED (must fail)
    await expect(caller.demo.generateRtiDraft({ caseId })).rejects.toThrow(
      "RTI drafting is only permitted after a case has reached the ESCALATED status."
    );

    // 8. Escalate to Cybercrime
    const cyberResult = await caller.demo.escalateToCybercrime({ caseId });
    expect(cyberResult.success).toBe(true);
    expect(cyberResult.case?.status).toBe("ESCALATED");

    const cyberState = await caller.demo.getState();
    expect(cyberState.step).toBeGreaterThanOrEqual(4);
    expect(cyberState.case?.status).toBe("ESCALATED");

    // 9. Generate RTI draft (now permitted)
    const rtiResult = await caller.demo.generateRtiDraft({ caseId });
    expect(rtiResult.success).toBe(true);
    expect(rtiResult.content).toContain("APPLICATION UNDER SECTION 6(1)");
    expect(rtiResult.content).toContain(caseId);

    const rtiState = await caller.demo.getState();
    expect(rtiState.step).toBe(5);
    expect(rtiState.documents.some(d => d.kind === "RTI_DRAFT")).toBe(true);
    expect(rtiState.events.some(e => e.type === "RTI_DRAFT_CREATED")).toBe(true);

    // 10. Safe Reset Demo
    const cleanReset = await caller.demo.resetDemo();
    expect(cleanReset.success).toBe(true);
    expect(cleanReset.count).toBeGreaterThanOrEqual(1);

    const finalState = await caller.demo.getState();
    expect(finalState.hasCase).toBe(false);
    expect(finalState.step).toBe(0);
  });
});
