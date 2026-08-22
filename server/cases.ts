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

export function canManageCaseCommunications(input: {
  role: LienGuardRole;
  currentUserId: number;
  caseOwnerId: number;
}) {
  if (input.role === "admin" || input.role === "authority") return true;
  return input.role === "citizen" && input.currentUserId === input.caseOwnerId;
}

export function isTerminalCaseStatus(status: CaseStatus) {
  return status === "RESOLVED" || status === "CLOSED";
}

export function isCaseStatusTransitionAllowed(current: CaseStatus, next: CaseStatus) {
  if (current === next) return true;
  if (isTerminalCaseStatus(current)) return false;
  return true;
}

export function calculateDeadline(daysFromNow: number = 7): Date {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + daysFromNow);
  return deadline;
}

export function getDeadlineStatus(responseDeadline?: Date | string | null): {
  isOverdue: boolean;
  daysRemaining: number;
  label: string;
} {
  if (!responseDeadline) {
    return { isOverdue: false, daysRemaining: 0, label: "No active deadline" };
  }
  const now = new Date().getTime();
  const deadlineTime = new Date(responseDeadline).getTime();
  const diffMs = deadlineTime - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { isOverdue: true, daysRemaining: diffDays, label: `${Math.abs(diffDays)}d overdue` };
  }
  if (diffDays === 0) {
    return { isOverdue: false, daysRemaining: 0, label: "Due today" };
  }
  return { isOverdue: false, daysRemaining: diffDays, label: `${diffDays}d remaining` };
}

