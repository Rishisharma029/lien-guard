import { describe, expect, it, vi } from "vitest";

const caseState = vi.hoisted(() => ({
  currentCase: {
    id: 1,
    caseId: "LG-2026-CASE01",
    userId: 4,
    title: "Original title",
    description: "Original case description for testing.",
    caseType: "Lien review",
    status: "OPEN" as "OPEN" | "UNDER_REVIEW" | "AWAITING_RESPONSE" | "ESCALATED" | "RESOLVED" | "CLOSED",
    priority: "NORMAL" as const,
    authorityName: "Test Authority",
    authorityEmail: "authority@example.com",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  updateCaseDetails: vi.fn(),
  setCaseStatus: vi.fn(),
  createOutboundEmail: vi.fn(async () => ({ id: 7, state: "queued" })),
  listCaseCommunications: vi.fn(async () => []),
  listCaseEvents: vi.fn(async () => []),
  listCaseDocuments: vi.fn(async () => []),
  recordCaseFollowUp: vi.fn(async () => ({ id: 1, caseId: 1, direction: "outbound", subject: "Follow-up request recorded", counterparty: "Authority", body: "Follow-up", state: "recorded", createdAt: new Date() })),
}));

vi.mock("./db", () => ({
  changeUserRoleWithAudit: vi.fn(),
  createCase: vi.fn(),
  createCaseDocument: vi.fn(),
  createOutboundEmail: caseState.createOutboundEmail,
  getCaseByReference: vi.fn(async () => caseState.currentCase),
  getNotificationsForUser: vi.fn(async () => []),
  getRoleChangeAudits: vi.fn(async () => []),
  listCasesForUser: vi.fn(async () => []),
  listCaseCommunications: caseState.listCaseCommunications,
  listCaseDocuments: caseState.listCaseDocuments,
  listCaseEvents: caseState.listCaseEvents,
  listUsersForAdmin: vi.fn(async () => []),
  markNotificationRead: vi.fn(async () => true),
  recordCaseFollowUp: caseState.recordCaseFollowUp,
  setCaseStatus: caseState.setCaseStatus,
  updateCaseDetails: caseState.updateCaseDetails,
}));

vi.mock("./automation", () => ({
  deliverQueuedCommunication: vi.fn(async () => ({ state: "deferred", communicationId: 7, reason: "Maileroo is not configured in this environment." })),
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
      name: `${role} test`,
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

describe("cases.update", () => {
  it("passes validated editable fields through for an owning citizen", async () => {
    caseState.updateCaseDetails.mockReset();
    caseState.updateCaseDetails.mockResolvedValue({
      ...caseState.currentCase,
      title: "Updated title",
      priority: "HIGH",
    });

    const caller = appRouter.createCaller(createContext("citizen", 4));
    const result = await caller.cases.update({
      caseId: "LG-2026-CASE01",
      title: "Updated title",
      description: "Updated case description with enough detail.",
      caseType: "Priority review",
      priority: "HIGH",
    });

    expect(caseState.updateCaseDetails).toHaveBeenCalledWith({
      caseId: "LG-2026-CASE01",
      actorUserId: 4,
      title: "Updated title",
      description: "Updated case description with enough detail.",
      caseType: "Priority review",
      priority: "HIGH",
    });
    expect(result).toMatchObject({ title: "Updated title", priority: "HIGH" });
  });

  it("rejects non-owner citizen and bank callers before updating the case", async () => {
    caseState.updateCaseDetails.mockReset();
    const citizenCaller = appRouter.createCaller(createContext("citizen", 9));
    const bankCaller = appRouter.createCaller(createContext("bank", 9));

    await expect(citizenCaller.cases.update({ caseId: "LG-2026-CASE01", title: "Not allowed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(bankCaller.cases.update({ caseId: "LG-2026-CASE01", title: "Not allowed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(caseState.updateCaseDetails).not.toHaveBeenCalled();
  });

  it("requires at least one editable field", async () => {
    const caller = appRouter.createCaller(createContext("admin", 7));
    await expect(caller.cases.update({ caseId: "LG-2026-CASE01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("enforces citizen ownership in the real case retrieval procedure", async () => {
    const nonOwner = appRouter.createCaller(createContext("citizen", 9));
    const authority = appRouter.createCaller(createContext("authority", 9));

    await expect(nonOwner.cases.get({ caseId: "LG-2026-CASE01" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(authority.cases.get({ caseId: "LG-2026-CASE01" })).resolves.toMatchObject({ caseId: "LG-2026-CASE01" });
  });

  it("returns a protected case detail package only to callers with case access", async () => {
    const owner = appRouter.createCaller(createContext("citizen", 4));
    const nonOwner = appRouter.createCaller(createContext("citizen", 9));

    await expect(owner.cases.detail({ caseId: "LG-2026-CASE01" })).resolves.toMatchObject({ case: { caseId: "LG-2026-CASE01" }, timeline: expect.any(Array) });
    await expect(nonOwner.cases.detail({ caseId: "LG-2026-CASE01" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permits authority lifecycle updates while rejecting citizens and terminal-case reopens", async () => {
    caseState.currentCase.status = "UNDER_REVIEW";
    caseState.setCaseStatus.mockReset();
    caseState.setCaseStatus.mockResolvedValue({ ...caseState.currentCase, status: "ESCALATED" });

    const authority = appRouter.createCaller(createContext("authority", 7));
    const citizen = appRouter.createCaller(createContext("citizen", 4));

    await expect(authority.cases.updateStatus({ caseId: "LG-2026-CASE01", status: "ESCALATED" })).resolves.toMatchObject({ status: "ESCALATED" });
    expect(caseState.setCaseStatus).toHaveBeenCalledWith({
      caseId: "LG-2026-CASE01",
      previousStatus: "UNDER_REVIEW",
      nextStatus: "ESCALATED",
      actorUserId: 7,
    });
    await expect(citizen.cases.updateStatus({ caseId: "LG-2026-CASE01", status: "RESOLVED" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    caseState.currentCase.status = "RESOLVED";
    await expect(authority.cases.updateStatus({ caseId: "LG-2026-CASE01", status: "UNDER_REVIEW" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    caseState.currentCase.status = "OPEN";
  });

  it("rejects lifecycle skips and no-op status changes", async () => {
    const authority = appRouter.createCaller(createContext("authority", 7));
    await expect(authority.cases.updateStatus({ caseId: "LG-2026-CASE01", status: "ESCALATED" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(authority.cases.updateStatus({ caseId: "LG-2026-CASE01", status: "OPEN" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("queues an authority email only for an authorized case participant", async () => {
    const owner = appRouter.createCaller(createContext("citizen", 4));
    const nonOwner = appRouter.createCaller(createContext("citizen", 8));

    await expect(owner.communications.sendToAuthority({
      caseId: "LG-2026-CASE01",
      subject: "Request for case update",
      body: "Please provide the current status of this recorded lien matter.",
    })).resolves.toMatchObject({ communicationId: 7, delivery: { state: "deferred" } });
    expect(caseState.createOutboundEmail).toHaveBeenCalledWith(expect.objectContaining({
      caseRecordId: 1,
      actorUserId: 4,
      recipientEmail: "authority@example.com",
      subject: "[LG-2026-CASE01] Request for case update",
    }));
    await expect(nonOwner.communications.sendToAuthority({
      caseId: "LG-2026-CASE01",
      subject: "Not allowed",
      body: "This operation must not be permitted for a different case owner.",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("records an owned citizen follow-up but rejects unauthorized callers", async () => {
    const owner = appRouter.createCaller(createContext("citizen", 4));
    const nonOwner = appRouter.createCaller(createContext("citizen", 8));
    await expect(owner.communications.recordFollowUp({ caseId: "LG-2026-CASE01", note: "Please provide an update." })).resolves.toMatchObject({ subject: "Follow-up request recorded" });
    await expect(nonOwner.communications.recordFollowUp({ caseId: "LG-2026-CASE01" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
