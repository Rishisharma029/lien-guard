export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "PASSWORD_CHANGED"
  | "SESSION_REVOKED"
  | "UNAUTHORIZED_ACCESS_ATTEMPT"
  | "ADMIN_ACTION"
  | "FILE_UPLOAD_REJECTED"
  | "FILE_DOWNLOAD_DENIED"
  | "CSRF_REJECTED"
  | "RATE_LIMIT_TRIGGERED"
  | "WEBHOOK_VALIDATION_FAILED"
  | "INVALID_AUTHORITY_ACCESS"
  | "PROMPT_INJECTION_DETECTED";

export interface SecurityEventData {
  type: SecurityEventType;
  userId?: number | string | null;
  caseId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | string;
  result: "ALLOWED" | "BLOCKED" | "WARNING" | "SUCCESS";
}

/**
 * Structured security audit logger.
 * Never logs passwords, secrets, full JWTs, or raw document content.
 */
export function logSecurityEvent(event: SecurityEventData): void {
  const sanitizedDetails = typeof event.details === "object" && event.details !== null
    ? sanitizeObject(event.details)
    : event.details;

  const logEntry = {
    timestamp: new Date().toISOString(),
    securityEvent: event.type,
    userId: event.userId ?? "anonymous",
    caseId: event.caseId ?? undefined,
    ip: maskIp(event.ip ?? "unknown"),
    userAgent: event.userAgent ? event.userAgent.slice(0, 150) : undefined,
    result: event.result,
    details: sanitizedDetails,
  };

  if (event.result === "BLOCKED" || event.type === "PROMPT_INJECTION_DETECTED" || event.type === "UNAUTHORIZED_ACCESS_ATTEMPT") {
    console.warn(`[SECURITY ALERT] [${event.type}] [${event.result}]:`, JSON.stringify(logEntry));
  } else {
    console.info(`[SECURITY AUDIT] [${event.type}] [${event.result}]:`, JSON.stringify(logEntry));
  }
}

function maskIp(ip: string): string {
  if (!ip || ip === "unknown") return "unknown";
  if (ip === "127.0.0.1" || ip === "::1") return ip;
  // Mask last octet of IPv4
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  return ip.slice(0, Math.min(ip.length, 12)) + "...";
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = new Set([
    "password",
    "secret",
    "token",
    "jwt",
    "authorization",
    "cookie",
    "apikey",
    "api_key",
    "base64",
    "content",
  ]);

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 500) {
      sanitized[key] = value.slice(0, 500) + "... [truncated]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
