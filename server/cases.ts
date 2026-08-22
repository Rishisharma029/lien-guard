import type { Case, CaseEvent, CaseStatus, LienGuardRole } from "../drizzle/schema";

export function canAccessCase(role: LienGuardRole, currentUserId: number, caseOwnerId: number) {
  // Authority and administrator queues are operationally global. Citizen and
  // bank identities remain owner-scoped until an explicit portfolio assignment
  // model is introduced, preventing cross-institutional record exposure.
  return role === "authority" || role === "admin" || currentUserId === caseOwnerId;
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
  return (input.role === "citizen" || input.role === "bank") && input.currentUserId === input.caseOwnerId && !isTerminalCaseStatus(input.status);
}

export function isTerminalCaseStatus(status: CaseStatus) {
  return status === "RESOLVED" || status === "CLOSED";
}

const allowedTransitions: Record<CaseStatus, readonly CaseStatus[]> = {
  OPEN: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["AWAITING_RESPONSE", "ESCALATED", "RESOLVED", "CLOSED"],
  AWAITING_RESPONSE: ["UNDER_REVIEW", "ESCALATED"],
  ESCALATED: ["UNDER_REVIEW", "RESOLVED", "CLOSED"],
  RESOLVED: [],
  CLOSED: [],
};

/** The state machine rejects no-op, skipped, and terminal-state transitions. */
export function isCaseStatusTransitionAllowed(current: CaseStatus, next: CaseStatus) {
  return allowedTransitions[current].includes(next);
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

function titleForEvent(event: CaseEvent) {
  switch (event.type) {
    case "CASE_CREATED":
      return "Case record created";
    case "DETAILS_UPDATED":
      return "Case details updated";
    case "STATUS_CHANGED":
      return "Lifecycle status changed";
    case "COMMUNICATION_RECORDED":
      return "Communication recorded";
    case "EMAIL_QUEUED":
      return "Email queued";
    case "EMAIL_SENT":
      return "Email sent";
    case "EMAIL_FAILED":
      return "Email delivery needs attention";
    case "INBOUND_EMAIL_RECEIVED":
      return "Inbound email received";
    case "DEADLINE_FOLLOW_UP_QUEUED":
      return "Deadline follow-up queued";
    case "DEADLINE_ESCALATED":
      return "Deadline escalation triggered";
    case "DOCUMENT_UPLOADED":
      return "Document added";
    case "RTI_DRAFT_CREATED":
      return "RTI draft prepared";
    default:
      return "Case activity recorded";
  }
}

function toneForEvent(event: CaseEvent): CaseTimelineEvent["tone"] {
  if (event.nextStatus === "ESCALATED" || event.type === "DEADLINE_ESCALATED" || event.type === "EMAIL_FAILED") return "danger";
  if (event.nextStatus === "RESOLVED" || event.nextStatus === "CLOSED" || event.type === "EMAIL_SENT") return "success";
  if (event.type === "CASE_CREATED" || event.type === "STATUS_CHANGED" || event.type === "EMAIL_QUEUED" || event.type === "DEADLINE_FOLLOW_UP_QUEUED") return "active";
  if (event.type === "INBOUND_EMAIL_RECEIVED") return "warning";
  return "neutral";
}

/**
 * Builds chronology only from stored facts. A deadline is a derived reminder;
 * every other item comes from the immutable server-side case-event stream.
 */
export function createCaseTimeline(caseRecord: Case, events: CaseEvent[] = []): CaseTimelineEvent[] {
  const history: CaseTimelineEvent[] = events.length
    ? events.map(event => ({
        id: `event-${event.id}`,
        title: titleForEvent(event),
        detail: event.message,
        occurredAt: event.createdAt,
        tone: toneForEvent(event),
      }))
    : [
        {
          id: "case-created",
          title: "Case record created",
          detail: "The matter was added to the protected LienGuard case register.",
          occurredAt: caseRecord.createdAt,
          tone: "active",
        },
      ];

  // Existing cases created before the event migration have no status event.
  // Preserve their visible lifecycle state without fabricating communications.
  if (!events.length && caseRecord.status !== "OPEN") {
    history.push({
      id: "current-status",
      title: `Status is ${caseRecord.status.split("_").join(" ").toLowerCase()}`,
      detail: "This is the current lifecycle state recorded for the case.",
      occurredAt: caseRecord.updatedAt,
      tone: caseRecord.status === "RESOLVED" || caseRecord.status === "CLOSED" ? "success" : caseRecord.status === "ESCALATED" ? "danger" : "active",
    });
  }

  if (caseRecord.responseDeadline) {
    history.push({
      id: "response-deadline",
      title: "Response deadline recorded",
      detail: "A response deadline is visible in this case record.",
      occurredAt: caseRecord.responseDeadline,
      tone: caseRecord.responseDeadline.getTime() < Date.now() ? "danger" : "warning",
    });
  }

  return history.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}
