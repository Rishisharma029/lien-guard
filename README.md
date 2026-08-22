<div align="center">

# 🛡️ LienGuard

### Enterprise Property Lien & Dispute Governance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](./LICENSE)
[![React](https://img.shields.io/badge/React-19.x-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC-v11-25c2a0?style=for-the-badge&logo=trpc&logoColor=white)](https://trpc.io)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.44-c5f74f?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6e9f18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Active-22c55e?style=for-the-badge&logo=github&logoColor=white)](./docs/index.html)

<p align="center">
  A secure, full-stack, multi-stakeholder governance system for property liens, collateral interests, and dispute resolution with end-to-end type safety and immutable audit logging.
</p>

[**Explore Live Documentation (GitHub Pages)**](./docs/index.html) &bull;
[**Hosting Handoff**](./HOSTING_HANDOFF.md) &bull;
[**Local Demo**](./docs/local_demo.md) &bull;
[**Architecture**](./ARCHITECTURE.md) &bull;
[**Contributing**](./CONTRIBUTING.md) &bull;
[**Security Policy**](./SECURITY.md)

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
  - [High-Level Data Flow](#high-level-data-flow)
  - [Role-Based Access Control (RBAC) Matrix](#role-based-access-control-rbac-matrix)
  - [Case Lifecycle State Machine](#case-lifecycle-state-machine)
  - [Role Elevation & Audit Sequence](#role-elevation--audit-sequence)
  - [Database Schema (ER Diagram)](#database-schema-er-diagram)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Quickstart](#installation--quickstart)
  - [Environment Variables](#environment-variables)
  - [Database Migrations](#database-migrations)
- [tRPC API Reference](#-trpc-api-reference)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [GitHub Pages Deployment](#-github-pages-deployment)
- [Hosting Handoff](#-hosting-handoff)
- [Project Directory Structure](#-project-directory-structure)
- [Security & Governance](#-security--governance)
- [Contributing & Community](#-contributing--community)
- [License](#-license)

---

## 🌟 Overview

**LienGuard** provides a unified, cryptographic, and auditable digital infrastructure for managing encumbrances, legal claims, and lien disputes across real estate and personal property. 

Property liens often suffer from fragmented communications, jurisdictional delays, and lack of transparency between property owners, financial institutions, and municipal/county authorities. LienGuard solves this by enforcing:

1. **Role-Tailored Portals**: Distinct, role-gated experiences for **Citizens**, **Lending Banks**, **Legal Authorities**, and **System Administrators**.
2. **Deterministic Case State Transitions**: Enforcing valid lifecycle paths (`OPEN` &rarr; `UNDER_REVIEW` &rarr; `AWAITING_RESPONSE` &rarr; `ESCALATED` &rarr; `RESOLVED` / `CLOSED`).
3. **Immutable Audit Provenance**: Transactional recording of all permission modifications, administrative escalations, and status alterations.
4. **Real-Time Notification Dispatches**: Immediate in-app transparency alerts whenever user access levels or case statuses update.

---

## 🚀 Key Features

| Capability | Description |
| :--- | :--- |
| **Multi-Role Workspaces** | Purpose-built dashboards with contextual views for Citizens (Property Position), Banks (Portfolio Security), Authorities (Claims Queue), and Admins (Access Governance). |
| **Strict RBAC Enforcement** | Middleware-level access checks (`roleProcedure`, `adminProcedure`) preventing unauthorized mutations and restricting case visibility to assigned parties. |
| **Case Lifecycle Engine** | Automatic state machine with strict status transition checks preventing illegal jumps or re-opening of closed cases. |
| **Atomic Audit Logs** | Every administrative role assignment is transactionally written to the `role_change_audits` ledger with automated rollback on failure. |
| **Self-Modification Guard** | Prevents administrator self-lockout or privilege escalation bypasses from within the governance console. |
| **End-to-End Type Safety** | Zero runtime type divergence with tRPC v11, Zod schema validation, and Drizzle ORM MySQL models. |
| **Resilient Error Recovery** | React 19 error boundaries, failure probe simulation flags, and query retry mechanisms ensuring zero UI crashes. |

---

## 🏗️ System Architecture

### High-Level Data Flow

```mermaid
flowchart TB
    subgraph Client["Frontend Client (React 19 + Vite + Tailwind v4)"]
        UI["Modern UI / Dashboard Layout"]
        Router["Wouter Router"]
        TRPCClient["tRPC Client + React Query v5"]
    end

    subgraph Server["Backend Application (Express + Node.js)"]
        TRPCServer["tRPC v11 Router Engine"]
        AuthGuard["JWT & Cookie Auth Guard"]
        RBACGuard["Role Procedure Middleware"]
        ZodValidator["Zod Input Validation Engine"]
    end

    subgraph Services["Core Domain Services"]
        CaseService["Case Lifecycle Service"]
        AuditService["Audit Trail Recorder"]
        NotifService["Notification Dispatcher"]
    end

    subgraph Storage["Storage & Persistence"]
        DrizzleORM["Drizzle ORM"]
        MySQL[("MySQL / TiDB Database")]
        S3Storage[("AWS S3 Object Store")]
    end

    UI --> Router
    Router --> TRPCClient
    TRPCClient -->|Type-Safe RPC Requests| TRPCServer
    TRPCServer --> AuthGuard
    AuthGuard --> RBACGuard
    RBACGuard --> ZodValidator
    ZodValidator --> CaseService & AuditService & NotifService
    CaseService --> DrizzleORM
    AuditService --> DrizzleORM
    NotifService --> DrizzleORM
    DrizzleORM --> MySQL
    CaseService -.->|Evidence Uploads| S3Storage
```

---

### Role-Based Access Control (RBAC) Matrix

```mermaid
graph TD
    User([Authenticated User]) --> Role{Role Assigned}
    Role -->|citizen| C[Citizen Workspace]
    Role -->|bank| B[Bank Workspace]
    Role -->|authority| A[Authority Workspace]
    Role -->|admin| AD[Admin Governance Workspace]

    C --> C1[View Own Property Position]
    C --> C2[Submit Cases & Upload Evidence]
    C --> C3[Edit Own Open Cases]

    B --> B1[Portfolio Review & Secured Interests]
    B --> B2[Cross-Property Exposure Tracking]
    B --> B3[Submit Institutional Inquiries]

    A --> A1[Operational Dispute Review Queue]
    A --> A2[Verify Legal Claims & Records]
    A --> A3[Execute Case Status Transitions]

    AD --> AD1[User & Access Governance]
    AD --> AD2[Assign & Change User Roles]
    AD --> AD3[Inspect Immutable Audit Log]
```

| Role | Workspace Route | Case Access Scope | Can Update Case Status? | Can Manage Roles? |
| :--- | :--- | :--- | :---: | :---: |
| **`citizen`** (Default) | `/workspace` | Own submitted cases | :x: | :x: |
| **`bank`** | `/workspace` | Secured portfolio cases | :x: | :x: |
| **`authority`** | `/workspace` | All verified dispute claims | :white_check_mark: | :x: |
| **`admin`** | `/admin/users` & `/workspace` | Global case registry | :white_check_mark: | :white_check_mark: |

---

### Case Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> OPEN: Case Created (Citizen / Bank)
    OPEN --> UNDER_REVIEW: Authority Queue Assignment
    UNDER_REVIEW --> AWAITING_RESPONSE: Evidence / Clarification Requested
    AWAITING_RESPONSE --> UNDER_REVIEW: Evidence Submitted
    UNDER_REVIEW --> ESCALATED: Legal / Regulatory Dispute Flagged
    ESCALATED --> UNDER_REVIEW: Dispute Hearing Conducted
    UNDER_REVIEW --> RESOLVED: Claim Verified / Lien Discharged
    UNDER_REVIEW --> CLOSED: Dismissed / Completed
    RESOLVED --> [*]
    CLOSED --> [*]
```

---

### Role Elevation & Audit Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant TRPC as tRPC (users.changeRole)
    participant Guard as RBAC & Self-Modification Guard
    participant DB as Drizzle / MySQL Transaction
    participant Notif as Notification Engine
    actor Target as Affected User

    Admin->>TRPC: changeRole(targetUserId, newRole)
    TRPC->>Guard: Validate Admin role & ensure targetUserId != Admin.id
    alt Attempt to modify self
        Guard-->>Admin: 400 Bad Request (Cannot modify self)
    else Authorized Action
        Guard->>DB: START TRANSACTION
        DB->>DB: UPDATE users SET role = newRole
        DB->>DB: INSERT INTO role_change_audits (target, actor, prevRole, newRole)
        DB->>Notif: INSERT INTO user_notifications (role_changed)
        DB->>DB: COMMIT TRANSACTION
        TRPC-->>Admin: 200 OK (Success response)
        Notif-->>Target: Push In-App Role Update Notification
    end
```

---

### Database Schema (ER Diagram)

```mermaid
erDiagram
    users ||--o{ cases : "owns / files"
    users ||--o{ user_notifications : "receives"
    users ||--o{ role_change_audits : "target of change"
    users ||--o{ role_change_audits : "performed change"

    users {
        int id PK
        varchar openId UK
        text name
        varchar email
        varchar loginMethod
        enum role "citizen | bank | authority | admin"
        timestamp createdAt
        timestamp updatedAt
        timestamp lastSignedIn
    }

    cases {
        int id PK
        varchar caseId UK "LG-CASE-XXXX"
        int userId FK
        varchar title
        text description
        varchar caseType
        enum status "OPEN | UNDER_REVIEW | AWAITING_RESPONSE | ESCALATED | RESOLVED | CLOSED"
        enum priority "LOW | NORMAL | HIGH | URGENT"
        timestamp createdAt
        timestamp updatedAt
    }

    user_notifications {
        int id PK
        int userId FK
        enum type "role_changed"
        varchar title
        text message
        timestamp readAt
        timestamp createdAt
    }

    role_change_audits {
        int id PK
        int targetUserId FK
        int changedByUserId FK
        enum previousRole "citizen | bank | authority | admin"
        enum newRole "citizen | bank | authority | admin"
        timestamp createdAt
    }
```

---

## 💻 Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev) | High performance concurrent rendering |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com) + [Radix UI](https://www.radix-ui.com/) | Accessible, modern component system |
| **Client Routing** | [Wouter](https://github.com/molefrog/wouter) | Lightweight client-side routing |
| **Server State** | [TanStack React Query v5](https://tanstack.com/query) | Cache synchronization and query retry |
| **Icons & Animation** | [Lucide React](https://lucide.dev) + [Framer Motion](https://www.framer.com/motion/) | Polished enterprise UI interactions |
| **API Protocol** | [tRPC v11](https://trpc.io) | End-to-end full-stack type safety |
| **Validation** | [Zod v4](https://zod.dev) | Strict runtime schema validation |
| **Backend Runtime** | [Node.js](https://nodejs.org) + [Express](https://expressjs.com) | Production server and API layer |
| **ORM & Database** | [Drizzle ORM](https://orm.drizzle.team) + [MySQL2](https://github.com/sidorares/node-mysql2) | High-throughput schema migrations and transactions |
| **Testing** | [Vitest](https://vitest.dev) | Fast unit and integration test runner |
| **Object Storage** | [AWS S3 SDK](https://aws.amazon.com/s3/) | Presigned URLs and document storage |

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **pnpm**: `v10.x` (recommended) or `npm` / `yarn`
- **MySQL / TiDB**: `v8.0+`

### Installation & Quickstart

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Rishisharma029/lien-guard.git
   cd lien-guard
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

4. **Run Database Migrations**:
   ```bash
   pnpm run db:push
   ```

5. **Start Development Server**:
   ```bash
   pnpm run dev
   ```
   Open `http://localhost:3000` to view the application.

---

### Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Application environment mode | `development` \| `production` |
| `PORT` | Local web server listening port | `3000` |
| `DATABASE_URL` | MySQL / TiDB connection string | `mysql://root:pass@localhost:3306/lienguard` |
| `JWT_SECRET` | Secret key for signing session tokens | `32+_char_random_cryptographic_secret` |
| `OAUTH_SERVER_URL` | OAuth authorization endpoint | `https://auth.example.com` |
| `AWS_ACCESS_KEY_ID` | AWS S3 access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret access key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_S3_BUCKET` | S3 bucket name for documents | `lienguard-documents` |

---

### Database Migrations

LienGuard uses **Drizzle Kit** to manage migrations:

```bash
# Generate and apply database migrations
pnpm run db:push

# Generate migration SQL files only
pnpm exec drizzle-kit generate

# Open Drizzle Studio database browser
pnpm exec drizzle-kit studio
```

---

## 🔌 tRPC API Reference

All procedures are accessible via `@trpc/client` or direct HTTP POST requests:

### Authentication & Workspaces
- `auth.me` (Query): Retrieve current session user and role.
- `auth.logout` (Mutation): Clear session cookies and invalidate authentication.
- `workspace.overview` (Query, Protected): Get role-scoped workspace metadata and summary statistics.

### Case Management (`cases.*`)
- `cases.list` (Query, Protected): Fetch all cases within caller's role scope.
- `cases.get` (Query, Protected): Retrieve specific case details by `caseId`.
- `cases.create` (Mutation, Protected): Create a new case (`title`, `description`, `caseType`, `priority`).
- `cases.update` (Mutation, Protected): Update editable case properties for open/owned cases.
- `cases.updateStatus` (Mutation, Authority/Admin): Advance case state (`OPEN` &rarr; `UNDER_REVIEW`, etc.).

### User & Governance (`users.*`)
- `users.list` (Query, Admin): List all system users with role statuses.
- `users.roleHistory` (Query, Admin): View immutable history of all role changes and actors.
- `users.changeRole` (Mutation, Admin): Assign a new role to a user with automatic audit and notification.

### Notifications (`notifications.*`)
- `notifications.list` (Query, Protected): List unread and historical notifications for current user.
- `notifications.markRead` (Mutation, Protected): Mark specific notification as read.

---

## 🧪 Testing & Quality Assurance

LienGuard includes comprehensive automated tests covering authentication, RBAC boundaries, state machine validations, and transactional audits.

```bash
# Run Vitest automated test suite
pnpm test

# Run TypeScript static type check
pnpm run check

# Format codebase with Prettier
pnpm run format

# Run full production build
pnpm run build
```

---

## 🌐 GitHub Pages Deployment

GitHub Pages publishes **documentation only**; it does not run the LienGuard Node backend, database, protected authentication, email flow, or webhook endpoints. The documentation site is pre-configured for GitHub Pages:

1. Static documentation assets live in the [`docs/`](./docs) directory.
2. The GitHub Actions workflow [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) automatically publishes updates on push to `main`.
3. You can also view the documentation locally by opening `docs/index.html` in any modern web browser.

## 🚀 Hosting Handoff

For the complete frontend and backend deployment package, start with [`HOSTING_HANDOFF.md`](./HOSTING_HANDOFF.md). It describes the included Docker image, required server-side environment variables, MySQL migration sequence, and the difference between a static Vercel preview and a full LienGuard runtime. For a no-secret visual walkthrough before deployment, run [`pnpm demo:local`](./docs/local_demo.md). If an existing Vercel project is serving a server bundle as text, apply the repository’s [`Vercel static-preview correction`](./docs/vercel_static_preview.md).

---

## 📁 Project Directory Structure

```
LienGuard/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Automated CI test & typecheck pipeline
│       └── deploy-pages.yml       # GitHub Pages deployment action
├── client/                        # React 19 Frontend
│   ├── public/                    # Static public assets
│   └── src/
│       ├── _core/hooks/useAuth.ts # Authentication hooks
│       ├── components/ui/         # Radix UI primitives & layout elements
│       ├── contexts/              # Theme and UI context providers
│       ├── pages/
│       │   ├── AdminUsers.tsx     # Governance & user role management
│       │   ├── Cases.tsx          # Case management & error recovery
│       │   ├── Home.tsx           # Public landing page
│       │   └── Workspace.tsx      # Role-aware workspace views
│       ├── App.tsx                # App router & providers
│       └── index.css              # Tailwind v4 token configurations
├── server/                        # Express + tRPC Backend
│   ├── _core/                     # Context, cookie, and tRPC setup
│   ├── cases.ts                   # Case access rules & state machine engine
│   ├── db.ts                      # Drizzle transactions & query helper
│   ├── routers.ts                 # Root API router definition
│   └── *.test.ts                  # Vitest backend integration tests
├── drizzle/                       # Database schema & migrations
│   ├── schema.ts                  # Drizzle ORM table definitions
│   └── migrations/                # Generated SQL migration files
├── docs/                          # GitHub Pages documentation portal
│   └── index.html                 # Interactive documentation app
├── .env.example                   # Environment configuration template
├── .gitignore                     # Git ignore rules
├── ARCHITECTURE.md                # In-depth technical architecture
├── CHANGELOG.md                   # Release history and changelog
├── CODE_OF_CONDUCT.md             # Contributor Covenant Code of Conduct
├── CONTRIBUTING.md                # Contribution guidelines & branching model
├── LICENSE                        # MIT License
└── package.json                   # Dependencies and npm scripts
```

---

## 🔒 Security & Governance

- **Responsible Disclosure**: Please review our [Security Policy](./SECURITY.md) for vulnerability reporting.
- **Privacy & Auditability**: Role changes and legal dispute resolutions create non-repudiable audit trails.

---

## 🤝 Contributing & Community

Contributions are welcomed! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## 📄 License

This project is licensed under the **MIT License** &bull; see the [LICENSE](./LICENSE) file for details.

<div align="center">
  <sub>Built with ❤️ by the LienGuard Open Source Contributors.</sub>
</div>
