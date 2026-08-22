import type { Case, CaseStatus, LienGuardRole } from "../drizzle/schema";

export function canAccessCase(role: LienGuardRole, currentUserId: number, caseOwnerId: number) {
  return role !== "citizen" || currentUserId === caseOwnerId;
}

export function canUpdateCaseStatus(role: LienGuardRole) {
  return role === "authority" || role === "admin";
}

export function canUpdateCaseDetails(input: {
  role: LienGuardRole;
  currentUserId: number;
  caseOwnerId: number;
  status: CaseStatus;
}) {
  if (input.role === "admin" || input.role === "authority") return true;
  return input.role === "citizen" && input.currentUserId === input.caseOwnerId && !isTerminalCaseStatus(input.status);
}

export function isTerminalCaseStatus(status: CaseStatus) {
  return status === "RESOLVED" || status === "CLOSED";
}

export function isCaseStatusTransitionAllowed(current: CaseStatus, next: CaseStatus) {
  if (current === next) return true;
  if (isTerminalCaseStatus(current)) return false;
  return next !== "OPEN";
}

export type CaseHealth = "ON_TRACK" | "RESPONSE_PENDING" | "DEADLINE_APPROACHING" | "ESCALATION_REQUIRED" | "UNDER_REVIEW" | "RESOLVED";

export type CaseTimelineEvent = {
  id: string;
  title: string;
  detail: string;
  occurredAt: Date;
  tone: "neutral" | "warning" | "danger" | "success" | "active";
};

export function getCaseHealth(caseRecord: Pick<Case, "status" | "responseDeadline">, now = new Date()): CaseHealth {
  if (caseRecord.status === "RESOLVED" || caseRecord.status === "CLOSED") return "RESOLVED";
  if (caseRecord.status === "ESCALATED") return "ESCALATION_REQUIRED";
  if (caseRecord.status === "UNDER_REVIEW") return "UNDER_REVIEW";
  if (caseRecord.status === "AWAITING_RESPONSE") {
    if (!caseRecord.responseDeadline) return "RESPONSE_PENDING";
    const remainingMs = caseRecord.responseDeadline.getTime() - now.getTime();
    if (remainingMs <= 0) return "ESCALATION_REQUIRED";
    if (remainingMs <= 24 * 60 * 60 * 1000) return "DEADLINE_APPROACHING";
    return "RESPONSE_PENDING";
  }
  return "ON_TRACK";
}

export function createCaseTimeline(caseRecord: Case): CaseTimelineEvent[] {
  const events: CaseTimelineEvent[] = [
    {
      id: "case-created",
      title: "Case record created",
      detail: "The matter was added to the protected LienGuard case register.",
      occurredAt: caseRecord.createdAt,
      tone: "active",
    },
  ];

  if (caseRecord.responseDeadline) {
    events.push({
      id: "response-deadline",
      title: "Response deadline recorded",
      detail: "A response deadline is visible in this case record.",
      occurredAt: caseRecord.responseDeadline,
      tone: caseRecord.responseDeadline.getTime() < Date.now() ? "danger" : "warning",
    });
  }

  if (caseRecord.status !== "OPEN") {
    events.push({
      id: "current-status",
      title: `Status is ${caseRecord.status.split("_").join(" ").toLowerCase()}`,
      detail: "This is the current lifecycle state recorded for the case.",
      occurredAt: caseRecord.updatedAt,
      tone: caseRecord.status === "RESOLVED" || caseRecord.status === "CLOSED" ? "success" : caseRecord.status === "ESCALATED" ? "danger" : "active",
    });
  }

  return events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}
