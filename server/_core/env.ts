const optional = (name: string) => process.env[name]?.trim() ?? "";

export type EmailDeliveryMode = "disabled" | "demo" | "live";

function parseEmailDeliveryMode(value: string): EmailDeliveryMode {
  if (value === "demo" || value === "live") return value;
  return "disabled";
}

function parseDemoRecipients(value: string) {
  return new Set(
    value
      .split(",")
      .map(item => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function createEmailDeliveryGuard(modeValue: string, recipientsValue: string) {
  const mode = parseEmailDeliveryMode(modeValue.trim().toLowerCase());
  const recipients = parseDemoRecipients(recipientsValue);
  return {
    mode,
    recipients,
    isRecipientAllowed(recipient: string) {
      if (mode === "live") return true;
      if (mode !== "demo") return false;
      return recipients.has(recipient.trim().toLowerCase());
    },
    blockReason(recipient: string) {
      if (mode === "disabled") return "Email delivery is disabled for this environment.";
      if (mode === "demo") return `Demo delivery is limited to the configured controlled-recipient allowlist; ${recipient} is not permitted.`;
      return "";
    },
  };
}

/**
 * Central runtime configuration. Secrets are intentionally read only here and
 * never exposed through the tRPC contract or client bundle.
 */
export const ENV = {
  appId: optional("VITE_APP_ID"),
  cookieSecret: optional("JWT_SECRET"),
  databaseUrl: optional("DATABASE_URL"),
  oAuthServerUrl: optional("OAUTH_SERVER_URL"),
  ownerOpenId: optional("OWNER_OPEN_ID"),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: optional("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: optional("BUILT_IN_FORGE_API_KEY"),
  mailerooSmtpHost: optional("MAILEROO_SMTP_HOST") || "smtp.maileroo.com",
  mailerooSmtpPort: Number.parseInt(optional("MAILEROO_SMTP_PORT") || "587", 10),
  mailerooSmtpUser: optional("MAILEROO_SMTP_USER"),
  mailerooSmtpPassword: optional("MAILEROO_SMTP_PASSWORD"),
  mailerooFromEmail: optional("MAILEROO_FROM_EMAIL"),
  mailerooReplyTo: optional("MAILEROO_REPLY_TO"),
  mailerooInboundDomain: optional("MAILEROO_INBOUND_DOMAIN").toLowerCase(),
  automationSecret: optional("AUTOMATION_SECRET"),
  deadlineEscalationGraceHours: Math.min(30 * 24, Math.max(1, Number.parseInt(optional("DEADLINE_ESCALATION_GRACE_HOURS") || "48", 10) || 48)),
  emailDeliveryMode: parseEmailDeliveryMode(optional("EMAIL_DELIVERY_MODE").toLowerCase()),
  demoEmailRecipients: parseDemoRecipients(optional("DEMO_EMAIL_RECIPIENTS")),
};

const emailDeliveryGuard = createEmailDeliveryGuard(
  optional("EMAIL_DELIVERY_MODE"),
  optional("DEMO_EMAIL_RECIPIENTS"),
);

export function isMailerooConfigured() {
  return Boolean(
    ENV.mailerooSmtpHost &&
      Number.isInteger(ENV.mailerooSmtpPort) &&
      ENV.mailerooSmtpPort > 0 &&
      ENV.mailerooSmtpUser &&
      ENV.mailerooSmtpPassword &&
      ENV.mailerooFromEmail,
  );
}

/**
 * Default-deny guardrail for external delivery. Demo mode permits only the
 * explicit controlled-recipient allowlist; live mode is intentional and broad.
 */
export function isEmailRecipientAllowedForDelivery(recipient: string) {
  return emailDeliveryGuard.isRecipientAllowed(recipient);
}

export function getEmailDeliveryBlockReason(recipient: string) {
  return emailDeliveryGuard.blockReason(recipient);
}
