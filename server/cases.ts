import type { CaseStatus, LienGuardRole } from "../drizzle/schema";

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
