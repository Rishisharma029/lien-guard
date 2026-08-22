const optional = (name: string) => process.env[name]?.trim() ?? "";

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
  mailerooInboundSecret: optional("MAILEROO_INBOUND_SECRET"),
  automationSecret: optional("AUTOMATION_SECRET"),
  deadlineEscalationGraceHours: Math.min(30 * 24, Math.max(1, Number.parseInt(optional("DEADLINE_ESCALATION_GRACE_HOURS") || "48", 10) || 48)),
};

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
