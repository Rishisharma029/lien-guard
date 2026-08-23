import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { ENV, isMailerooConfigured } from "./_core/env";

const CONTROL_CHARACTER = /[\r\n\u0000]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAILEROO_API_SEND_URL = "https://smtp.maileroo.com/send";

export type CaseEmailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
};

export type CaseEmailDelivery = {
  providerMessageId: string;
  transport?: "api" | "smtp";
};

export function isValidEmailAddress(value: string) {
  return value.length <= 320 && EMAIL_PATTERN.test(value) && !CONTROL_CHARACTER.test(value);
}

function safeHeader(value: string, field: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || CONTROL_CHARACTER.test(normalized)) {
    throw new Error(`${field} is invalid.`);
  }
  return normalized;
}

function htmlEscape(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

/** Sends an operational email via Maileroo REST API (HTTP POST). */
export async function deliverCaseEmailViaApi(message: CaseEmailMessage): Promise<CaseEmailDelivery> {
  if (!ENV.mailerooApiKey) {
    throw new Error("MAILEROO_API_KEY is not configured.");
  }

  const to = safeHeader(message.to, "Recipient", 320);
  if (!isValidEmailAddress(to)) throw new Error("Recipient must be a valid email address.");

  const subject = safeHeader(message.subject, "Subject", 180);
  const text = message.text.trim();
  if (!text || text.length > 8_000 || CONTROL_CHARACTER.test(text.replace(/\r?\n/g, ""))) {
    throw new Error("Email content is invalid.");
  }

  const from = safeHeader(ENV.mailerooFromEmail, "Sender", 320);
  if (!isValidEmailAddress(from)) throw new Error("MAILEROO_FROM_EMAIL must be a verified email address.");

  const replyTo = message.replyTo || ENV.mailerooReplyTo || undefined;
  if (replyTo && !isValidEmailAddress(replyTo)) throw new Error("Reply-to must be a valid email address.");

  const params = new URLSearchParams();
  params.append("from", `LienGuard Statutory Notices <${from}>`);
  params.append("to", to);
  params.append("subject", subject);
  params.append("plain", text);
  params.append("html", `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${htmlEscape(text)}</pre>`);
  if (replyTo) params.append("reply_to", replyTo);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(MAILEROO_API_SEND_URL, {
      method: "POST",
      headers: {
        "X-API-Key": ENV.mailerooApiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-LienGuard-Idempotency-Key": safeHeader(message.idempotencyKey, "Idempotency key", 160),
      },
      body: params.toString(),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => null) as {
      success?: boolean;
      message?: string;
      data?: { reference_id?: string; message_id?: string; id?: string };
    } | null;

    if (!response.ok || !result?.success) {
      const errorMsg = result?.message || `Maileroo API returned HTTP status ${response.status}`;
      throw new Error(errorMsg);
    }

    const providerMessageId = result.data?.reference_id || result.data?.message_id || result.data?.id || `mlr-api-${Date.now()}`;
    return { providerMessageId, transport: "api" };
  } finally {
    clearTimeout(timer);
  }
}

function buildSmtpTransport() {
  if (!ENV.mailerooSmtpUser || !ENV.mailerooSmtpPassword) {
    throw new Error("Maileroo SMTP credentials are not configured.");
  }

  const secure = ENV.mailerooSmtpPort === 465;
  const options: SMTPTransport.Options = {
    host: ENV.mailerooSmtpHost,
    port: ENV.mailerooSmtpPort,
    secure,
    requireTLS: !secure,
    auth: { user: ENV.mailerooSmtpUser, pass: ENV.mailerooSmtpPassword },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true, servername: ENV.mailerooSmtpHost },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
  return nodemailer.createTransport(options);
}

/** Sends an operational email via Maileroo SMTP over TLS. */
export async function deliverCaseEmailViaSmtp(message: CaseEmailMessage): Promise<CaseEmailDelivery> {
  const to = safeHeader(message.to, "Recipient", 320);
  if (!isValidEmailAddress(to)) throw new Error("Recipient must be a valid email address.");

  const subject = safeHeader(message.subject, "Subject", 180);
  const text = message.text.trim();
  if (!text || text.length > 8_000 || CONTROL_CHARACTER.test(text.replace(/\r?\n/g, ""))) {
    throw new Error("Email content is invalid.");
  }

  const from = safeHeader(ENV.mailerooFromEmail, "Sender", 320);
  if (!isValidEmailAddress(from)) throw new Error("MAILEROO_FROM_EMAIL must be a verified email address.");

  const replyTo = message.replyTo || ENV.mailerooReplyTo || undefined;
  if (replyTo && !isValidEmailAddress(replyTo)) throw new Error("Reply-to must be a valid email address.");

  const result = await buildSmtpTransport().sendMail({
    from: `LienGuard Statutory Notices <${from}>`,
    to,
    subject,
    text,
    html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${htmlEscape(text)}</pre>`,
    replyTo,
    headers: {
      "X-LienGuard-Idempotency-Key": safeHeader(message.idempotencyKey, "Idempotency key", 160),
      "X-Auto-Response-Suppress": "All",
    },
  });

  const providerMessageId = result.messageId?.trim();
  if (!providerMessageId) throw new Error("Maileroo did not return a message identifier.");
  return { providerMessageId, transport: "smtp" };
}

/**
 * Sends a case email using the primary Maileroo REST API,
 * with automatic fallback to Maileroo SMTP over TLS.
 */
export async function deliverCaseEmail(message: CaseEmailMessage): Promise<CaseEmailDelivery> {
  if (!isMailerooConfigured()) {
    throw new Error("Maileroo is not configured. Set MAILEROO_API_KEY or SMTP credentials in .env.");
  }

  // 1. Try Maileroo REST API if API key is present
  if (ENV.mailerooApiKey) {
    try {
      return await deliverCaseEmailViaApi(message);
    } catch (apiError) {
      console.warn("[Maileroo] REST API delivery error, attempting SMTP fallback:", apiError instanceof Error ? apiError.message : apiError);
      // Fall through to SMTP if SMTP is configured
      if (ENV.mailerooSmtpUser && ENV.mailerooSmtpPassword) {
        return await deliverCaseEmailViaSmtp(message);
      }
      throw apiError;
    }
  }

  // 2. Otherwise use SMTP
  return await deliverCaseEmailViaSmtp(message);
}
