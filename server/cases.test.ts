import { describe, expect, it } from "vitest";
import {
  calculateDeadline,
  canAccessCase,
  canManageCaseCommunications,
  canUpdateCaseDetails,
  canUpdateCaseStatus,
  getDeadlineStatus,
  isCaseStatusTransitionAllowed,
  isTerminalCaseStatus,
} from "./cases";

describe("case permissions and lifecycle", () => {
  it("limits a citizen to their own case while operational roles can access the case queue", () => {
    expect(canAccessCase("citizen", 4, 4)).toBe(true);
    expect(canAccessCase("citizen", 4, 9)).toBe(false);
    expect(canAccessCase("bank", 4, 9)).toBe(true);
    expect(canAccessCase("authority", 4, 9)).toBe(true);
  });

  it("restricts lifecycle updates to authority and administrator roles", () => {
    expect(canUpdateCaseStatus("citizen")).toBe(false);
    expect(canUpdateCaseStatus("bank")).toBe(false);
    expect(canUpdateCaseStatus("authority")).toBe(true);
    expect(canUpdateCaseStatus("admin")).toBe(true);
  });

  it("allows communication management for case owners, authorities, and admins", () => {
    expect(canManageCaseCommunications({ role: "citizen", currentUserId: 4, caseOwnerId: 4 })).toBe(true);
    expect(canManageCaseCommunications({ role: "citizen", currentUserId: 4, caseOwnerId: 9 })).toBe(false);
    expect(canManageCaseCommunications({ role: "authority", currentUserId: 4, caseOwnerId: 9 })).toBe(true);
    expect(canManageCaseCommunications({ role: "admin", currentUserId: 4, caseOwnerId: 9 })).toBe(true);
  });

  it("allows editable field updates for the owning citizen and operational decision-makers only", () => {
    expect(canUpdateCaseDetails({ role: "citizen", currentUserId: 4, caseOwnerId: 4, status: "OPEN" })).toBe(true);
    expect(canUpdateCaseDetails({ role: "citizen", currentUserId: 4, caseOwnerId: 9, status: "OPEN" })).toBe(false);
    expect(canUpdateCaseDetails({ role: "citizen", currentUserId: 4, caseOwnerId: 4, status: "RESOLVED" })).toBe(false);
    expect(canUpdateCaseDetails({ role: "bank", currentUserId: 4, caseOwnerId: 4, status: "OPEN" })).toBe(false);
    expect(canUpdateCaseDetails({ role: "authority", currentUserId: 4, caseOwnerId: 9, status: "OPEN" })).toBe(true);
    expect(canUpdateCaseDetails({ role: "admin", currentUserId: 4, caseOwnerId: 9, status: "CLOSED" })).toBe(true);
  });

  it("prevents reopening terminal cases", () => {
    expect(isTerminalCaseStatus("RESOLVED")).toBe(true);
    expect(isTerminalCaseStatus("CLOSED")).toBe(true);
    expect(isCaseStatusTransitionAllowed("UNDER_REVIEW", "ESCALATED")).toBe(true);
    expect(isCaseStatusTransitionAllowed("RESOLVED", "OPEN")).toBe(false);
    expect(isCaseStatusTransitionAllowed("CLOSED", "UNDER_REVIEW")).toBe(false);
  });

  it("calculates SLA deadlines and status correctly", () => {
    const futureDate = calculateDeadline(7);
    expect(futureDate.getTime()).toBeGreaterThan(Date.now());

    const activeStatus = getDeadlineStatus(futureDate);
    expect(activeStatus.isOverdue).toBe(false);
    expect(activeStatus.daysRemaining).toBeGreaterThanOrEqual(6);

    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const overdueStatus = getDeadlineStatus(pastDate);
    expect(overdueStatus.isOverdue).toBe(true);
    expect(overdueStatus.label).toContain("overdue");
  });
});
