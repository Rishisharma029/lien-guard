# LienGuard Technical Architecture

LienGuard is a distributed, end-to-end Property Lien Management and Dispute Governance platform engineered for security, compliance, auditability, and speed.

---

## 1. System Architecture

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Layer (React 19 + Vite + Tailwind v4)"]
        UI["Modern UI / Responsive Dashboard"]
        Router["Wouter Client Router"]
        TRPCClient["@trpc/client + @tanstack/react-query"]
        Theme["Theme & Accessibility Provider"]
    end

    subgraph APILayer["Backend API & Middleware Layer (Express + Node.js)"]
        TRPCServer["tRPC v11 Router & Dispatcher"]
        AuthMiddleware["JWT Session & Cookie Auth Guard"]
        RBACMiddleware["Role Procedures (Citizen, Bank, Authority, Admin)"]
        ZodValidator["Zod Input Validation Engine"]
    end

    subgraph DomainLayer["Business Domain Logic"]
        CaseEngine["Case Management & State Machine"]
        AuditEngine["Audit Logger & Event Recorder"]
        NotificationEngine["In-App Transparency Notifications"]
    end

    subgraph DataLayer["Persistence & Storage Layer"]
        Drizzle["Drizzle ORM Engine"]
        MySQL[("MySQL / TiDB Database")]
        S3[("AWS S3 Object Storage")]
    end

    UI --> Router
    Router --> TRPCClient
    TRPCClient -->|tRPC Queries & Mutations over HTTP/JSON| TRPCServer
    TRPCServer --> AuthMiddleware
    AuthMiddleware --> RBACMiddleware
    RBACMiddleware --> ZodValidator
    ZodValidator --> CaseEngine & AuditEngine & NotificationEngine
    CaseEngine --> Drizzle
    AuditEngine --> Drizzle
    NotificationEngine --> Drizzle
    Drizzle --> MySQL
    CaseEngine -.->|Document Attachments| S3
```

---

## 2. Role-Based Access Control (RBAC) Matrix

LienGuard enforces strict, multi-tiered access control based on user roles:

```mermaid
graph TD
    User([Authenticated User]) --> Role{Role Assignment}
    Role -->|citizen| C[Citizen Workspace]
    Role -->|bank| B[Bank Workspace]
    Role -->|authority| A[Authority Workspace]
    Role -->|admin| AD[Admin Governance Workspace]

    C --> C1[View Own Property Lien Position]
    C --> C2[Submit Cases & Upload Evidence]
    C --> C3[Edit Own Open Cases]

    B --> B1[Portfolio Review & Secured Interests]
    B --> B2[Cross-Property Exposure Tracking]
    B --> B3[Submit Institutional Inquiries]

    A --> A1[Operational Case Review Queue]
    A --> A2[Verify Legal Claims & Evidence]
    A --> A3[Update Case Status Transitions]

    AD --> AD1[System Access Governance]
    AD --> AD2[Assign & Change User Roles]
    AD --> AD3[Immutable Role Change Audit Log]
```

### Access Permission Matrix

| Operation / Procedure | Citizen | Bank | Authority | Admin |
| :--- | :---: | :---: | :---: | :---: |
| `auth.me` / `auth.logout` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| `workspace.overview` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| `cases.create` | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| `cases.list` (scoped to owner / portfolio) | Own Cases | Assigned Portfolio | All Verified | All Cases |
| `cases.get` | Own Cases | Assigned Portfolio | All Verified | All Cases |
| `cases.update` (details) | Own Open Cases | Interest Cases | :white_check_mark: | :white_check_mark: |
| `cases.updateStatus` (state machine) | :x: | :x: | :white_check_mark: | :white_check_mark: |
| `users.list` | :x: | :x: | :x: | :white_check_mark: |
| `users.roleHistory` | :x: | :x: | :x: | :white_check_mark: |
| `users.changeRole` | :x: | :x: | :x: | :white_check_mark: |

---

## 3. Case State Machine Workflow

Cases follow a deterministic lifecycle model preventing illegal state mutations:

```mermaid
stateDiagram-v2
    [*] --> OPEN: Case Created (Citizen/Bank)
    OPEN --> UNDER_REVIEW: Authority Claims Queue
    UNDER_REVIEW --> AWAITING_RESPONSE: Clarification / Evidence Required
    AWAITING_RESPONSE --> UNDER_REVIEW: Citizen/Bank Updates Case
    UNDER_REVIEW --> ESCALATED: Legal / Regulatory Dispute Flagged
    ESCALATED --> UNDER_REVIEW: Resolution Proposed
    UNDER_REVIEW --> RESOLVED: Claim Verified / Lien Discharged
    UNDER_REVIEW --> CLOSED: Completed / Dismissed
    RESOLVED --> [*]
    CLOSED --> [*]
```

---

## 4. Role Governance & Audit Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrator
    participant TRPC as tRPC API (users.changeRole)
    participant Auth as Auth & Self-Modification Guard
    participant DB as Drizzle / MySQL Transaction
    participant Notif as Notification Engine
    actor Target as Target User

    Admin->>TRPC: changeRole(targetUserId, newRole)
    TRPC->>Auth: Verify caller is Admin & targetUserId != caller.id
    alt Caller is modifying self
        Auth-->>Admin: 400 Bad Request (Cannot modify self)
    else Authorized
        Auth->>DB: BEGIN TRANSACTION
        DB->>DB: Fetch user & verify existence
        DB->>DB: UPDATE users SET role = newRole
        DB->>DB: INSERT INTO role_change_audits (target, actor, prevRole, newRole)
        DB->>Notif: INSERT INTO user_notifications (role_changed)
        DB->>DB: COMMIT TRANSACTION
        TRPC-->>Admin: 200 OK (Role updated & logged)
        Notif-->>Target: Instant In-App Role Update Notification
    end
```

---

## 5. Database Schema (Entity Relationship Diagram)

```mermaid
erDiagram
    users ||--o{ cases : "owns / creates"
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
