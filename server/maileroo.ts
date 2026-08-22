import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { ENV, isMailerooConfigured } from "./_core/env";

const CONTROL_CHARACTER = /[\r\n\u0000]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CaseEmailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
};

export type CaseEmailDelivery = {
  providerMessageId: string;
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

function buildTransport() {
  if (!isMailerooConfigured()) {
    throw new Error("Maileroo is not configured. Set the SMTP user, password, and verified sender address before attempting delivery.");
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

/** Sends a plain-text operational message through the configured Maileroo SMTP account. */
export async function deliverCaseEmail(message: CaseEmailMessage): Promise<CaseEmailDelivery> {
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

  const result = await buildTransport().sendMail({
    from,
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
  return { providerMessageId };
}
