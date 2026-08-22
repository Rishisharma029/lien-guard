# Security Policy

## Supported Versions

We actively provide security patches, vulnerability resolutions, and dependency updates for the following versions of LienGuard:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Security Architecture & Principles

LienGuard is designed with defence-in-depth principles for property lien records, legal claims, and multi-party administrative operations:

1. **Role-Based Access Control (RBAC)**:
   - Server-enforced middleware (`roleProcedure`, `adminProcedure`, `protectedProcedure`) guarantees that unauthorized users cannot execute privileged mutations or access foreign cases.
   - The default role for newly registered users is strictly `citizen`.
   - Administrators cannot modify their own roles from the user management interface to prevent privilege isolation lockouts.

2. **Cryptographic Auditability & Traceability**:
   - Every role assignment is strictly written to the `role_change_audits` table with `targetUserId`, `changedByUserId`, `previousRole`, `newRole`, and timestamp in a transactional boundary.
   - Target users receive immediate in-app transparency notifications via `user_notifications`.

3. **Secure Session Management**:
   - Authentication tokens are stored using `HttpOnly`, `SameSite=Lax` (or `None` in cross-origin setups with `Secure`), signed with cryptographic HMAC algorithms via `jose`.

4. **Input Sanitization & Type Safety**:
   - Every incoming request is strictly validated and sanitized via `zod` schemas before reaching the database layer.
   - SQL queries use parameterized prepared statements through `drizzle-orm` preventing SQL injection vectors.

---

## Reporting a Vulnerability

If you discover a security vulnerability within LienGuard, please follow responsible disclosure guidelines:

1. **Do NOT open a public GitHub issue** to report vulnerabilities.
2. Email your findings directly to **[security@lienguard.org](mailto:security@lienguard.org)**.
3. Include the following details:
   - Description of the vulnerability.
   - Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
   - Potential impact on users, data integrity, or infrastructure.
   - Suggested mitigation steps if known.

### Response Timeline

- **Initial Acknowledgment**: Within 24-48 hours.
- **Triage & Assessment**: Within 3-5 business days.
- **Fix & Patch Release**: Dependent on severity, typically within 7-14 business days.
- **Public Disclosure**: Coordinated after the patch has been released and deployed.
