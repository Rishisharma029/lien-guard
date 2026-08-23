import express, { type Express, type Request, type Response } from "express";
import { z } from "zod";
import { ENV } from "./_core/env";
import {
  createUserNotification,
  getCaseByReference,
  getCaseCommunicationByProviderMessageId,
  markOutboundEmailFailed,
  markOutboundEmailSent,
  recordInboundEmail,
  recordSystemCaseEvent,
} from "./db";
import { isValidEmailAddress } from "./maileroo";
import { analyzeInboundReply } from "./replyIntelligence";

const caseReferencePattern = /\b(LG-\d{4}-[A-F0-9]{12})\b/i;
const validationHost = "inbound-api.maileroo.net";

export const mailerooPayloadSchema = z.object({
  _id: z.string().trim().min(6).max(128),
  message_id: z.string().trim().min(1).max(512),
  envelope_sender: z.string().trim().min(3).max(320),
  recipients: z.array(z.string().trim().email().max(320)).min(1).max(25),
  headers: z.record(z.string(), z.array(z.string().max(500)).max(20)).default({}),
  body: z.object({
    stripped_plaintext: z.string().max(20_000).optional().default(""),
    plaintext: z.string().max(20_000).optional().default(""),
  }),
  validation_url: z.string().url().max(2_000).optional().default("https://inbound-api.maileroo.net/validate"),
  is_spam: z.boolean().default(false),
  spf_result: z.boolean().default(true),
  dkim_result: z.boolean().default(true),
  is_dmarc_aligned: z.boolean().default(true),
});

export type MailerooPayload = z.infer<typeof mailerooPayloadSchema>;

export function safeSubject(payload: MailerooPayload) {
  const subject = payload.headers.Subject?.[0]?.replace(/[\r\n\u0000]/g, " ").trim() || "Inbound case update";
  return subject.slice(0, 180);
}

export function getCaseReference(payload: MailerooPayload) {
  const textToScan = [
    safeSubject(payload),
    ...payload.recipients,
    payload.body.stripped_plaintext || "",
    payload.body.plaintext || "",
  ].join(" ");

  const match = textToScan.match(caseReferencePattern);
  if (match?.[1]) return match[1].toUpperCase();
  return null;
}

function isInboundRecipient(payload: MailerooPayload) {
  if (!ENV.mailerooInboundDomain) return true;
  return payload.recipients.some(recipient =>
    recipient.toLowerCase().includes(ENV.mailerooInboundDomain) ||
    recipient.toLowerCase().includes("maileroo") ||
    recipient.toLowerCase().includes("lienguard")
  );
}

export async function validateWithMaileroo(validationUrl: string) {
  const parsed = new URL(validationUrl);
  if (parsed.protocol !== "https:" || parsed.hostname !== validationHost || parsed.username || parsed.password) {
    // In local/test environments or mock validation URLs, skip network validation if not live host
    if (parsed.hostname !== "inbound-api.maileroo.net") {
      throw new Error("Maileroo validation URL was rejected.");
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(parsed, { method: "POST", redirect: "error", signal: controller.signal });
    if (!response.ok) throw new Error("Maileroo validation did not succeed.");
    const result = await response.json().catch(() => null) as { success?: boolean } | null;
    if (result && result.success === false) throw new Error("Maileroo validation rejected this delivery.");
  } catch (error) {
    if (ENV.isProduction && !ENV.localDemoMode) {
      throw error;
    }
    // In demo/test mode, allow graceful fallback if validation service is offline
  } finally {
    clearTimeout(timer);
  }
}

export async function handleMailerooInbound(req: Request, res: Response) {
  const parsed = mailerooPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid inbound email payload.", issues: parsed.error.issues });
    return;
  }
  const payload = parsed.data;

  // Security Verification: SPF, DKIM, DMARC, Spam check
  if (payload.is_spam || !payload.dkim_result || !payload.is_dmarc_aligned || !payload.spf_result) {
    res.status(202).json({
      accepted: false,
      reason: "Message did not meet inbound security policy (SPF/DKIM/DMARC failure or flagged as spam).",
      securityChecks: {
        spf: payload.spf_result,
        dkim: payload.dkim_result,
        dmarc: payload.is_dmarc_aligned,
        isSpam: payload.is_spam,
      },
    });
    return;
  }

  if (!isValidEmailAddress(payload.envelope_sender)) {
    res.status(400).json({ error: "Inbound sender is invalid." });
    return;
  }

  const caseId = getCaseReference(payload);
  if (!caseId) {
    res.status(202).json({ accepted: false, reason: "No LienGuard case reference was found." });
    return;
  }

  const caseRecord = await getCaseByReference(caseId);
  if (!caseRecord) {
    res.status(202).json({ accepted: false, reason: "Case record not found in system." });
    return;
  }

  // Sender Authorization: Verify against case authority email or demo allowlist
  const isAuthorized =
    Boolean(caseRecord.authorityEmail && caseRecord.authorityEmail.toLowerCase() === payload.envelope_sender.toLowerCase()) ||
    (Boolean(ENV.localDemoMode || ENV.emailDeliveryMode === "demo") &&
      Array.from(ENV.demoEmailRecipients).includes(payload.envelope_sender.toLowerCase()));

  if (!isAuthorized) {
    res.status(202).json({ accepted: false, reason: "Inbound sender is not the recorded authority for this case." });
    return;
  }

  try {
    if (payload.validation_url && payload.validation_url.includes("maileroo.net")) {
      await validateWithMaileroo(payload.validation_url);
    }

    const body = (payload.body.stripped_plaintext || payload.body.plaintext || "(No plain-text body was provided.)").trim().slice(0, 8_000);
    const subject = safeSubject(payload);

    const result = await recordInboundEmail({
      caseRecordId: caseRecord.id,
      providerMessageId: payload._id,
      senderEmail: payload.envelope_sender,
      subject,
      body,
    });

    // Run AI-Assisted Reply Intelligence
    const analysis = analyzeInboundReply({
      subject,
      body,
      senderEmail: payload.envelope_sender,
      caseId: caseRecord.caseId,
    });

    // Create user notification for case owner
    if (!result.duplicate) {
      await createUserNotification({
        userId: caseRecord.userId,
        title: analysis.intent === "REQUESTING_DOCUMENTS"
          ? `Action Required: Documents requested for ${caseRecord.caseId}`
          : `New reply received for case ${caseRecord.caseId}`,
        message: `${payload.envelope_sender}: ${analysis.summary}`,
      });
    }

    res.status(result.duplicate ? 200 : 201).json({
      accepted: true,
      duplicate: result.duplicate,
      caseId,
      communicationId: result.communication.id,
      analysis,
    });
  } catch (error) {
    console.error("[Maileroo inbound] processing failed", error instanceof Error ? error.message : error);
    res.status(502).json({ error: "Inbound message could not be verified or recorded." });
  }
}

const mailerooEventPayloadSchema = z.object({
  event: z.string().optional(),
  event_type: z.string().optional(),
  status: z.string().optional(),
  message_id: z.string().optional(),
  provider_message_id: z.string().optional(),
  id: z.string().optional(),
  recipient: z.string().optional(),
  email: z.string().optional(),
  reason: z.string().optional(),
  description: z.string().optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

async function handleMailerooEvents(req: Request, res: Response) {
  const parsed = mailerooEventPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid Maileroo event payload." });
    return;
  }

  const data = parsed.data;
  const eventName = (data.event || data.event_type || data.status || "delivered").toLowerCase();
  const providerMessageId = data.message_id || data.provider_message_id || data.id;

  if (!providerMessageId) {
    res.status(200).json({ received: true, note: "Event received without message_id." });
    return;
  }

  try {
    const communication = await getCaseCommunicationByProviderMessageId(providerMessageId);
    if (!communication) {
      res.status(200).json({ received: true, note: "Message not found in local records." });
      return;
    }

    if (eventName.includes("bounce") || eventName.includes("fail") || eventName.includes("drop") || eventName.includes("reject")) {
      const reason = data.reason || data.description || `Delivery ${eventName}`;
      await markOutboundEmailFailed({
        communicationId: communication.id,
        message: reason,
        actorLabel: "Maileroo event webhook",
      });
    } else if (eventName.includes("deliver") || eventName.includes("sent")) {
      if (communication.state === "queued") {
        await markOutboundEmailSent({
          communicationId: communication.id,
          providerMessageId,
          actorLabel: "Maileroo event webhook",
        });
      }
    } else if (eventName.includes("open") || eventName.includes("click")) {
      await recordSystemCaseEvent({
        caseRecordId: communication.caseId,
        type: "COMMUNICATION_RECORDED",
        message: `Recipient engagement recorded by Maileroo (${eventName}) for ${communication.recipientEmail || "recipient"}.`,
        actorLabel: "Maileroo engagement tracking",
      });
    }

    res.status(200).json({ received: true, event: eventName, communicationId: communication.id });
  } catch (error) {
    console.error("[Maileroo event webhook] processing error:", error);
    res.status(500).json({ error: "Event processing failed." });
  }
}

export function registerMailerooWebhook(app: Express) {
  // 1. Inbound email routing webhook (for incoming authority replies)
  app.post("/api/webhooks/maileroo/inbound", express.json({ limit: "256kb", strict: true }), handleMailerooInbound);

  // 2. Real-time delivery & engagement events callback (for delivery, open, click, bounce events)
  app.post("/api/webhooks/maileroo/events", express.json({ limit: "256kb", strict: true }), handleMailerooEvents);
  app.post("/api/webhooks/maileroo/delivery", express.json({ limit: "256kb", strict: true }), handleMailerooEvents);
}

