import express, { type Express, type Request, type Response } from "express";
import { z } from "zod";
import { ENV } from "./_core/env";
import { getCaseByReference, recordInboundEmail } from "./db";
import { isValidEmailAddress } from "./maileroo";

const caseReferencePattern = /\b(LG-\d{4}-[A-F0-9]{12})\b/i;
const validationHost = "inbound-api.maileroo.net";

const mailerooPayloadSchema = z.object({
  _id: z.string().trim().min(6).max(128),
  message_id: z.string().trim().min(1).max(512),
  envelope_sender: z.string().trim().min(3).max(320),
  recipients: z.array(z.string().trim().email().max(320)).min(1).max(25),
  headers: z.record(z.string(), z.array(z.string().max(500)).max(20)).default({}),
  body: z.object({
    stripped_plaintext: z.string().max(20_000).optional().default(""),
    plaintext: z.string().max(20_000).optional().default(""),
  }),
  validation_url: z.string().url().max(2_000),
  is_spam: z.boolean().default(false),
  dkim_result: z.boolean().default(false),
  is_dmarc_aligned: z.boolean().default(false),
});

type MailerooPayload = z.infer<typeof mailerooPayloadSchema>;

function safeSubject(payload: MailerooPayload) {
  const subject = payload.headers.Subject?.[0]?.replace(/[\r\n\u0000]/g, " ").trim() || "Inbound case update";
  return subject.slice(0, 180);
}

function getCaseReference(payload: MailerooPayload) {
  const candidates = [safeSubject(payload), ...payload.recipients];
  for (const candidate of candidates) {
    const match = candidate.match(caseReferencePattern);
    if (match?.[1]) return match[1].toUpperCase();
  }
  return null;
}

function isInboundRecipient(payload: MailerooPayload) {
  if (!ENV.mailerooInboundDomain) return false;
  return payload.recipients.some(recipient => recipient.toLowerCase().endsWith(`@${ENV.mailerooInboundDomain}`));
}

async function validateWithMaileroo(validationUrl: string) {
  const parsed = new URL(validationUrl);
  if (parsed.protocol !== "https:" || parsed.hostname !== validationHost || parsed.username || parsed.password) {
    throw new Error("Maileroo validation URL was rejected.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(parsed, { method: "POST", redirect: "error", signal: controller.signal });
    if (!response.ok) throw new Error("Maileroo validation did not succeed.");
    const result = await response.json().catch(() => null) as { success?: boolean } | null;
    if (!result?.success) throw new Error("Maileroo validation rejected this delivery.");
  } finally {
    clearTimeout(timer);
  }
}

async function handleMailerooInbound(req: Request, res: Response) {
  if (!ENV.mailerooInboundDomain) {
    res.status(503).json({ error: "Inbound email routing is not configured." });
    return;
  }

  const parsed = mailerooPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid inbound email payload." });
    return;
  }
  const payload = parsed.data;
  if (!isInboundRecipient(payload) || payload.is_spam || !payload.dkim_result || !payload.is_dmarc_aligned) {
    res.status(202).json({ accepted: false, reason: "Message did not meet inbound routing policy." });
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
  if (!caseRecord || !caseRecord.authorityEmail || caseRecord.authorityEmail.toLowerCase() !== payload.envelope_sender.toLowerCase()) {
    res.status(202).json({ accepted: false, reason: "Inbound sender is not the recorded authority for this case." });
    return;
  }

  try {
    // Maileroo validation URLs are single-use. Complete all local validation
    // first, then validate authenticity immediately before persistence.
    await validateWithMaileroo(payload.validation_url);
    const body = (payload.body.stripped_plaintext || payload.body.plaintext || "(No plain-text body was provided.)").trim().slice(0, 8_000);
    const result = await recordInboundEmail({
      caseRecordId: caseRecord.id,
      providerMessageId: payload._id,
      senderEmail: payload.envelope_sender,
      subject: safeSubject(payload),
      body,
    });
    res.status(result.duplicate ? 200 : 201).json({ accepted: true, duplicate: result.duplicate, caseId });
  } catch (error) {
    console.error("[Maileroo inbound] processing failed", error instanceof Error ? error.message : error);
    res.status(502).json({ error: "Inbound message could not be verified or recorded." });
  }
}

export function registerMailerooWebhook(app: Express) {
  // Maileroo keeps attachments out of the JSON callback, so the application
  // accepts a deliberately small event body rather than the document-upload limit.
  app.post("/api/webhooks/maileroo/inbound", express.json({ limit: "256kb", strict: true }), handleMailerooInbound);
}
