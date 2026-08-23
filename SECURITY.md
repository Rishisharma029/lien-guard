# 🛡️ LienGuard Security Architecture & Production Hardening

This document details the security model, defense-in-depth controls, threat boundaries, and production hardening policies implemented in **LienGuard**.

---

## 📑 Security Controls Summary

| Security Domain | Control Implementation | Status |
|---|---|---|
| **Transport Security (HSTS)** | `Strict-Transport-Security: max-age=31536000; includeSubDomains` in HTTPS/production | ✅ Active |
| **HTTP Security Headers** | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `X-Frame-Options: SAMEORIGIN`, `Content-Security-Policy: frame-ancestors 'self'` | ✅ Active |
| **CORS Policy** | Strict origin allowlist (`APP_ORIGIN`, `ALLOWED_ORIGINS`). No wildcard `*` with credentials. Dynamic reflection blocked. | ✅ Active |
| **CSRF Defense** | State-changing request origin & referer verification for browser sessions. Exemption only for cryptographically authorized webhooks & crons. | ✅ Active |
| **Session Cookies** | `HttpOnly=true`, `SameSite=Lax`, `Secure=true` (over HTTPS), 30-day max-age, cryptographic HMAC signatures via `jose`. | ✅ Active |
| **File Upload Security** | Magic byte inspection (`%PDF-`, `\x89PNG`, `\xFF\xD8\xFF`, clean UTF-8 text). Prohibits executable extensions (`.exe`, `.sh`, `.php`, `.js`, etc.). Sanitizes filenames. 10 MB limit. | ✅ Active |
| **Prompt Injection Defense** | All inbound email text is treated as **Untrusted Data**. Heuristic scanner detects & quarantines instruction overrides, exfiltration attempts, and state-change injections. AI outputs provide advisory classification only and cannot mutate privileged state directly. | ✅ Active |
| **Inbound Webhook Security** | SPF pass, DKIM pass, DMARC alignment, spam check, single-use validation URL verification, sender authorization, idempotency deduplication. | ✅ Active |
| **Rate Limiting** | Sliding window rate limits on Auth (15/min), API (300/min), Webhook (60/min), Uploads (20/min), and Scheduled crons (30/min). | ✅ Active |
| **Request Size Limits** | Express body size limits: Webhook (256 KB), Scheduled (64 KB), General API/Upload (15 MB). Rejects oversized requests with `HTTP 413`. | ✅ Active |
| **Role-Based Access Control** | Server-side `protectedProcedure`, `adminProcedure`, `roleProcedure` middleware with strict ownership checks (`canAccessCase`, `canUpdateCaseStatus`). | ✅ Active |
| **Audit & Security Logging** | Structured logging of `LOGIN_SUCCESS`, `UNAUTHORIZED_ACCESS_ATTEMPT`, `FILE_UPLOAD_REJECTED`, `PROMPT_INJECTION_DETECTED`, `ADMIN_ACTION`. Automatically redacts passwords, tokens, and secrets. | ✅ Active |
| **Demo Mode Guardrails** | Outbound emails restricted to `DEMO_EMAIL_RECIPIENTS` allowlist. Production runs with `LOCAL_DEMO_MODE=false`. | ✅ Active |

---

## 🔒 Database Permissions & Production User Hardening

In production environments, LienGuard must **never** run under the MySQL `root` account. Production deployments must use a dedicated, least-privilege application user:

### 1. Dedicated Runtime Application User
```sql
-- Create dedicated application user
CREATE USER 'lienguard_app'@'%' IDENTIFIED BY 'StrongSecretPasswordHere!';

-- Grant only runtime data manipulation privileges on the application database
GRANT SELECT, INSERT, UPDATE, DELETE ON lienguard.* TO 'lienguard_app'@'%';
FLUSH PRIVILEGES;
```

### 2. Migration / Administrative User (Deployments Only)
```sql
-- Separate deployment user used only during CI/CD migration runs
CREATE USER 'lienguard_migrator'@'%' IDENTIFIED BY 'MigrationSecretPassword!';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON lienguard.* TO 'lienguard_migrator'@'%';
FLUSH PRIVILEGES;
```

---

## 🤖 AI Reply Intelligence & Prompt Injection Boundary

LienGuard processes incoming authority emails using AI-assisted intelligence. To prevent instruction hijacking or adversarial prompt injection, a strict security boundary is enforced:

```
┌───────────────────────────────────────────────────────────┐
│ SYSTEM RULES & APPLICATION WORKFLOW (Immutable Code)      │
├───────────────────────────────────────────────────────────┤
│ ROLE-BASED ACCESS & PERMISSION CHECKS (Server Enforcement)│
├───────────────────────────────────────────────────────────┤
│ CASE RECORD DATA (MySQL Database)                         │
├───────────────────────────────────────────────────────────┤
│ ⚠️ UNTRUSTED INBOUND EMAIL CONTENT (Data Only)            │
└───────────────────────────────────────────────────────────┘
```

1. **Email Content is Pure Data**: Inbound body text is never interpolated as system execution prompts.
2. **Deterministic State Transitions**: AI analysis extracts intent classifications and document requirements for the citizen dashboard, but **cannot** directly trigger status transitions, dispatch unauthorized emails, delete records, or prepare unapproved RTI filings.
3. **Prompt Injection Quarantine**: Messages containing override signatures (e.g. *"ignore previous rules"*, *"reveal prompt"*, *"set status to resolved"*) are flagged, logged with `PROMPT_INJECTION_DETECTED`, and quarantined from influencing the assistive workflow.

---

## 📋 Production Deployment Security Checklist

Before launching LienGuard in production, verify that every item is satisfied:

- [ ] **HTTPS / TLS**: Enabled on load balancer / reverse proxy with valid TLS certificate.
- [ ] **HSTS**: `Strict-Transport-Security` header active.
- [ ] **Secure Cookies**: `JWT_SECRET` configured with a cryptographically strong 256-bit secret.
- [ ] **CORS Origins**: `APP_ORIGIN` set to your canonical production domain (e.g. `https://app.lienguard.org`).
- [ ] **Database User**: Running with dedicated non-root application user (`lienguard_app`).
- [ ] **Demo Mode Disabled**: `LOCAL_DEMO_MODE=false` in production environment.
- [ ] **Maileroo Credentials**: `MAILEROO_API_KEY` / SMTP credentials set to verified production domain.
- [ ] **Email Delivery Mode**: `EMAIL_DELIVERY_MODE=live` (or `demo` during pre-launch testing).
- [ ] **Automation Secret**: `AUTOMATION_SECRET` configured with a high-entropy bearer token.
- [ ] **Rate Limiting**: In-memory or Redis-backed rate limiting active.
- [ ] **Request Limits**: 15 MB upload limit and 256 KB webhook limit enforced.

---

## 🚨 Vulnerability Disclosure Policy

If you identify a potential security issue in LienGuard:
1. **Do NOT open a public GitHub issue**.
2. Report the vulnerability privately via **[security@lienguard.org](mailto:security@lienguard.org)**.
3. Our security team will acknowledge receipt within 24-48 hours and coordinate remediation.
