import type { Case, CaseCommunication } from "../drizzle/schema";
import { ENV, isMailerooConfigured } from "./_core/env";
import {
  createDeadlineFollowUpIfAbsent,
  escalateCaseForDeadline,
  listOverdueAwaitingResponseCases,
  listQueuedOutboundEmails,
  markOutboundEmailFailed,
  markOutboundEmailSent,
  recordDeadlineAutomationAction,
} from "./db";
import { deliverCaseEmail } from "./maileroo";

export type DeliveryResult =
  | { state: "sent"; communicationId: number; providerMessageId: string }
  | { state: "deferred"; communicationId: number; reason: string }
  | { state: "failed"; communicationId: number; reason: string };

export function deadlineActionKey(caseRecord: Pick<Case, "id" | "responseDeadline">, action: "follow-up" | "escalation") {
  const deadline = caseRecord.responseDeadline?.toISOString() ?? "no-deadline";
  return `${action}:${caseRecord.id}:${deadline}`;
}

export function buildDeadlineFollowUp(caseRecord: Pick<Case, "caseId" | "title" | "authorityName" | "responseDeadline">) {
  const deadline = caseRecord.responseDeadline?.toLocaleDateString("en-CA") ?? "the recorded deadline";
  return {
    subject: `Follow-up requested: ${caseRecord.caseId}`,
    body: [
      `Dear ${caseRecord.authorityName || "Authority"},`,
      "",
      `This is a recorded follow-up regarding LienGuard case ${caseRecord.caseId}: ${caseRecord.title}.`,
      `The response deadline was ${deadline}. Please provide the current status and any action taken.`,
      "",
      "This message was generated from the recorded case workflow. Please reply through the approved authority channel.",
    ].join("\n"),
  };
}

/** Delivers one already-queued message. It never retries a message that has left the queued state. */
export async function deliverQueuedCommunication(communication: CaseCommunication): Promise<DeliveryResult> {
  if (communication.state !== "queued") {
    return { state: "deferred", communicationId: communication.id, reason: "The message is no longer queued." };
  }
  if (!communication.recipientEmail) {
    await markOutboundEmailFailed({ communicationId: communication.id, message: "No recipient email address was recorded." });
    return { state: "failed", communicationId: communication.id, reason: "No recipient email address was recorded." };
  }
  if (!isMailerooConfigured()) {
    return { state: "deferred", communicationId: communication.id, reason: "Maileroo is not configured in this environment." };
  }

  try {
    const delivery = await deliverCaseEmail({
      to: communication.recipientEmail,
      subject: communication.subject,
      text: communication.body,
      idempotencyKey: `lg-communication-${communication.id}`,
    });
    await markOutboundEmailSent({ communicationId: communication.id, providerMessageId: delivery.providerMessageId });
    return { state: "sent", communicationId: communication.id, providerMessageId: delivery.providerMessageId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown SMTP delivery failure.";
    await markOutboundEmailFailed({ communicationId: communication.id, message: reason });
    return { state: "failed", communicationId: communication.id, reason };
  }
}

export async function deliverQueuedCommunications(limit = 50) {
  const queued = await listQueuedOutboundEmails(limit);
  const results: DeliveryResult[] = [];
  for (const communication of queued) {
    results.push(await deliverQueuedCommunication(communication));
  }
  return results;
}

export type DeadlineAutomationSummary = {
  scanned: number;
  followUpsQueued: number;
  escalated: number;
  delivery: DeliveryResult[];
  skippedWithoutRecipient: number;
};

/**
 * Processes only overdue AWAITING_RESPONSE cases. A follow-up is created once
 * for a deadline; after the grace interval the case is escalated once. Both
 * actions use a unique key, so retries and concurrent scheduler calls are safe.
 */
export async function runDeadlineAutomation(now = new Date()): Promise<DeadlineAutomationSummary> {
  const cases = await listOverdueAwaitingResponseCases(now);
  const summary: DeadlineAutomationSummary = { scanned: cases.length, followUpsQueued: 0, escalated: 0, delivery: [], skippedWithoutRecipient: 0 };
  const graceMilliseconds = ENV.deadlineEscalationGraceHours * 60 * 60 * 1000;

  for (const caseRecord of cases) {
    if (!caseRecord.responseDeadline) continue;
    const overdueMilliseconds = now.getTime() - caseRecord.responseDeadline.getTime();

    if (overdueMilliseconds >= graceMilliseconds) {
      const action = await recordDeadlineAutomationAction({
        caseRecordId: caseRecord.id,
        action: "DEADLINE_ESCALATION",
        idempotencyKey: deadlineActionKey(caseRecord, "escalation"),
      });
      if (action.created) {
        const escalated = await escalateCaseForDeadline({
          caseRecordId: caseRecord.id,
          previousStatus: "AWAITING_RESPONSE",
          message: `Response deadline passed without a recorded reply; automatically escalated after ${ENV.deadlineEscalationGraceHours} hours.`,
        });
        if (escalated) summary.escalated += 1;
      }
      continue;
    }

    if (!caseRecord.authorityEmail) {
      summary.skippedWithoutRecipient += 1;
      continue;
    }

    const message = buildDeadlineFollowUp(caseRecord);
    const action = await createDeadlineFollowUpIfAbsent({
      caseRecord,
      idempotencyKey: deadlineActionKey(caseRecord, "follow-up"),
      subject: message.subject,
      body: message.body,
    });
    if (action.created && action.communication) {
      summary.followUpsQueued += 1;
      summary.delivery.push(await deliverQueuedCommunication(action.communication));
    }
  }

  return summary;
}
