# Changelog

All notable changes to **LienGuard** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-22

### Added
- **Multi-Role RBAC Model**:
  - Implemented core user roles: `citizen` (default), `bank`, `authority`, and `admin`.
  - Added role-enforced tRPC procedures with automated permission gates.
- **Case Management Engine**:
  - Entity schema with unique case reference numbers (`LG-CASE-XXXX`).
  - Full lifecycle state machine (`OPEN`, `UNDER_REVIEW`, `AWAITING_RESPONSE`, `ESCALATED`, `RESOLVED`, `CLOSED`).
  - Priority levels (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
  - Owner-scoped querying and authority mutation boundaries.
- **Audit & Governance Logging**:
  - Immutable role change audit records (`role_change_audits`) capturing previous role, new role, actor, target, and timestamp.
  - Automated transactional rollback on failed audits.
- **Real-Time In-App Transparency Notifications**:
  - Automated notification creation on permission or role modifications.
  - Interactive notification tray with read status toggling.
- **Modern User Interface**:
  - Built with React 19, Tailwind CSS v4, Radix UI primitives, Lucide icons, and Framer Motion animations.
  - Role-tailored dashboards and workspace overviews.
  - Administrator User Management interface with role change dialogs and audit logs.
  - Resilient Case Management workspace with loading states and retry recovery.
- **Testing & Verification Suite**:
  - Vitest automated tests for role enforcement, self-modification guards, and transactional auditing.
  - Case access control and lifecycle transition unit & integration test coverage.
- **Documentation & CI/CD**:
  - Comprehensive GitHub Pages interactive documentation portal.
  - GitHub Actions workflows for continuous integration and automated static documentation deployment.
