<div align="center">

# 🛡️ LienGuard

### Enterprise Statutory Lien Governance, Compliance-Aware Workflow & Inbound Email Intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](./LICENSE)
[![React](https://img.shields.io/badge/React-19.x-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC-v11-25c2a0?style=for-the-badge&logo=trpc&logoColor=white)](https://trpc.io)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.44-c5f74f?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6e9f18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)
[![Maileroo](https://img.shields.io/badge/Maileroo-REST_%26_SMTP-ff6b6b?style=for-the-badge)](https://maileroo.com)

<p align="center">
  A secure, full-stack, compliance-aware platform for statutory bank account liens, police inquiry notices, and dispute resolution with two-way email intelligence, automated audit trails, and review-only RTI generation.
</p>

[**Hackathon Demo Guide**](#-hackathon-demo-mode) &bull;
[**Inbound Email Intelligence**](#-intelligent-inbound-email--reply-processing) &bull;
[**Compliance Workflow**](#-compliance-aware-workflow) &bull;
[**Architecture**](./ARCHITECTURE.md) &bull;
[**Contributing**](./CONTRIBUTING.md) &bull;
[**Security Policy**](./SECURITY.md)

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [⚖️ Compliance-Aware Workflow](#-compliance-aware-workflow)
- [📨 Intelligent Inbound Email & AI Reply Processing](#-intelligent-inbound-email--ai-reply-processing)
- [⚡ Hackathon Demo Mode](#-hackathon-demo-mode)
- [🚀 Key Features](#-key-features)
- [🏗️ Architecture & Security](#-architecture--security)
- [🛠️ Technology Stack](#-technology-stack)
- [🏁 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation & Quickstart](#installation--quickstart)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [📄 License](#-license)

---

## 🌟 Overview

**LienGuard** bridges the communication gap between citizens, nodal bank officers, cybercrime police authorities, and regulatory bodies when bank accounts are placed under statutory liens or cybercrime hold orders (e.g. Section 91/102 CrPC / P2P fraud disputes).

Instead of fragmented offline communications, LienGuard creates a **secure, auditable, two-way communication loop** around every case:
- Tracks statutory response deadlines and automates escalation warnings.
- Dispatches case-linked notices with unique identifiers (`[LG-YYYY-XXXXXXXXXXXX]`) via Maileroo REST API and SMTP over TLS.
- Ingests inbound replies via Maileroo Webhooks, verifies SPF/DKIM/DMARC, matches the exact case, and runs **AI-Assisted Reply Analysis** to extract document requirements and suggest next procedural actions.

---

## ⚖️ Compliance-Aware Workflow

LienGuard structures every case according to configured legal workflows and procedural requirements:

- **Rule-Based Case Handling**: Enforces valid state machine paths (`OPEN` &rarr; `UNDER_REVIEW` &rarr; `AWAITING_RESPONSE` &rarr; `ESCALATED` &rarr; `RESOLVED` / `CLOSED`).
- **Deadline Enforcement**: Tracks authority response deadlines (e.g. 48-hour statutory grace window) and triggers automated follow-ups.
- **Procedural Escalation**: Escalates cases only when required legal conditions and response timeouts are met.
- **Role-Based Access Control (RBAC)**: Distinct permissions for **Citizens**, **Nodal Banks**, **Police/Cybercrime Authorities**, and **System Administrators**.
- **Complete Audit Trail**: Every status change, role alteration, and communication dispatch is recorded immutably in `case_events` and `role_change_audits`.
- **Controlled RTI Assistance**: Generates a review-only Right to Information (Section 6(1)) draft when a case reaches the `ESCALATED` state. It is never filed automatically without citizen review.
- **Safety Guardrails**: Prevents unauthorized email deliveries, duplicate automated actions (idempotency keys), and illegal state regressions.

---

## 📨 Intelligent Inbound Email & AI Reply Processing

```
FOLLOW-UP / ESCALATION NOTICE
             ↓ [Subject: [LG-2026-XXXXXXXXXXXX] ...]
      Authority / Bank Replies
             ↓
  Maileroo Inbound Webhook (POST /api/webhooks/maileroo/inbound)
             ↓
 1. Request Validation (Single-use validation_url check)
 2. Security Verification (SPF Pass, DKIM Pass, DMARC Aligned, Anti-Spam)
 3. Case Matching (Regex extraction: LG-YYYY-XXXXXXXXXXXX)
 4. Sender Authorization (Matches recorded authorityEmail / demo allowlist)
 5. Idempotency Check (Deduplicates provider_message_id)
             ↓
 6. Store Inbound Message (case_communications: state="received")
 7. Record Immutable Timeline Event (case_events: INBOUND_EMAIL_RECEIVED)
 8. AI-Assisted Reply Intelligence (Extracts Intent & Document Checklist)
 9. Citizen Alert (user_notifications: "Action Required: Documents requested")
             ↓
 Closed-loop Case Intelligence & Next Action
```

### AI Reply Analysis Capabilities:
- **Intent Classification**: Classifies into `REQUESTING_DOCUMENTS`, `ACKNOWLEDGED`, `UNDER_REVIEW`, `ACTION_REQUIRED`, `RESOLVED`, `REJECTED`, or `NEEDS_CLARIFICATION`.
- **Document Checklist Extraction**: Automatically detects requests for *Original Bank Statements*, *Account-Opening Documents / KYC Forms*, *FIR Copies*, *Identity Proof (Aadhaar/PAN)*, *Transaction Receipts / UTR slips*, *Indemnity Bonds*, and *NOCs*.
- **Citizen Action Required**: Actionable summary of what the citizen needs to submit.
- **Suggested Next Step**: Recommends appropriate statutory next steps.
- **Legal Safety Disclaimer**: Clearly labeled `"AI-assisted analysis. Review before taking action."`

---

## ⚡ Hackathon Demo Mode

Judges can test the entire LienGuard workflow in seconds at **`/demo`** or from the homepage CTA:

1. **🚀 1. Register Demo Case**: Creates a dedicated case in MySQL with unique reference `LG-2026-XXXXXXXXXXXX` and status `AWAITING_RESPONSE`.
2. **📧 2. Send Follow-up**: Sends a real email through Maileroo (REST API / SMTP) to the allowlisted test inbox (`DEMO_EMAIL_RECIPIENTS`).
3. **🤖 3. Inbound Reply & AI Intelligence**:
   - **Real Loop**: Reply to the email in your Gmail inbox &rarr; Maileroo webhook fires &rarr; AI analyzes the reply &rarr; Document checklist appears live on screen.
   - **Instant Simulator**: Click *Simulate Authority Reply* for offline judge pitches.
4. **🏦 4. Escalate to Bank**: Updates status to `UNDER_REVIEW` and sends a formal Nodal Bank notice.
5. **🚨 5. Escalate to Cybercrime**: Updates status to `ESCALATED` citing Section 91/102 CrPC.
6. **📄 6. Generate RTI Draft**: Gated to `ESCALATED` status; generates Section 6(1) RTI application.
7. **🔄 Reset Demo**: Safely purges only demo records (`[HACKATHON DEMO]`) without touching real user cases.

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| **Dual Email Delivery** | Sends via **Maileroo REST API** (`POST https://smtp.maileroo.com/send`) with automatic fallback to **Maileroo SMTP** over TLS (`port 587`). |
| **Two-Way Webhook Pipeline** | Real-time webhook ingestion for inbound replies, delivery confirmations, bounces, and recipient engagement tracking. |
| **Conversation Thread UI** | Modern chat-style interface in Communications with outbound/inbound cards, "Verified ✓" checkmarks, and AI intelligence drawers. |
| **Role-Tailored Workspaces** | Purpose-built dashboards with contextual views for Citizens, Banks, Authorities, and Admins. |
| **End-to-End Type Safety** | Zero runtime type divergence with tRPC v11, Zod schema validation, and Drizzle ORM MySQL models. |
| **Strict Security Guardrails** | Delivery allowlist guardrail (`EMAIL_DELIVERY_MODE=demo`), CSRF token protection, and session cookie validation. |

---

## 🏗️ Architecture & Security

```mermaid
flowchart TB
    subgraph Client["Frontend Client (React 19 + Vite + Tailwind v4)"]
        UI["Modern UI / Dashboard Layout"]
        Router["Wouter Router"]
        TRPCClient["tRPC Client + React Query v5"]
        DemoUI["⚡ Hackathon Demo Mode (/demo)"]
    end

    subgraph Server["Backend Application (Express + Node.js)"]
        TRPCServer["tRPC v11 Router Engine"]
        MailerooService["Maileroo Engine (REST API + SMTP)"]
        InboundWebhook["Maileroo Inbound Webhook (/api/webhooks/maileroo/inbound)"]
        ReplyAI["AI Reply Intelligence Service"]
        DeadlineEngine["Deadline Automation Scheduler"]
    end

    subgraph External["External Services"]
        MailerooCloud["Maileroo Mail Platform"]
        MySQLDB[("MySQL Database (Drizzle ORM)")]
    end

    UI --> TRPCClient
    DemoUI --> TRPCClient
    TRPCClient --> TRPCServer
    TRPCServer --> MySQLDB
    TRPCServer --> MailerooService
    MailerooService --> MailerooCloud
    MailerooCloud --> InboundWebhook
    InboundWebhook --> ReplyAI
    InboundWebhook --> MySQLDB
    DeadlineEngine --> MySQLDB
```

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Wouter Router.
- **Backend**: Node.js, Express, tRPC v11, Zod.
- **Database & ORM**: MySQL, Drizzle ORM, Drizzle Kit.
- **Email Delivery & Inbound**: Maileroo REST API, Maileroo SMTP (Nodemailer over TLS), Maileroo Webhooks.
- **Testing**: Vitest, Node Test Runner.

---

## 🏁 Getting Started

### Prerequisites
- Node.js 20+ / 22+
- `pnpm` (v9+)
- MySQL Server (v8+)

### Environment Variables
Create a `.env` file in the root directory:

```env
# Application
NODE_ENV=development
PORT=3000
VITE_APP_ID=lien-guard-local

# Database
DATABASE_URL=mysql://root:password@127.0.0.1:3306/lienguard

# Security
JWT_SECRET=your-random-jwt-secret-string
AUTOMATION_SECRET=your-random-automation-secret-string
LOCAL_DEMO_MODE=true

# Maileroo Configuration
MAILEROO_API_KEY=your-maileroo-api-key
MAILEROO_SMTP_HOST=smtp.maileroo.com
MAILEROO_SMTP_PORT=587
MAILEROO_SMTP_USER=your-smtp-user@a.maileroo.net
MAILEROO_SMTP_PASSWORD=your-smtp-password
MAILEROO_FROM_EMAIL=notifications@your-verified-domain.maileroo.org
MAILEROO_REPLY_TO=your-email@gmail.com
MAILEROO_INBOUND_DOMAIN=your-verified-domain.maileroo.org

# Delivery Guardrail
EMAIL_DELIVERY_MODE=demo
DEMO_EMAIL_RECIPIENTS=your-email@gmail.com
DEADLINE_ESCALATION_GRACE_HOURS=48
```

### Installation & Quickstart

```bash
# 1. Install dependencies
pnpm install

# 2. Run database migrations
pnpm db:migrate

# 3. Seed demo data (optional)
pnpm demo:seed

# 4. Start the application
pnpm dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Testing & Quality Assurance

LienGuard includes comprehensive automated tests covering all lifecycle transitions, RBAC rules, document pipelines, and inbound email intelligence:

```bash
# Run all Vitest test suites
pnpm test

# Run TypeScript typechecks
pnpm check

# Build production bundle
pnpm build

# Run live E2E demo test against local server
node scripts/test-demo-e2e.mjs
```

### Test Suite Summary:
```
✓ server/case-journey.test.ts (2 tests)
✓ server/cases.test.ts (4 tests)
✓ server/documents.test.ts (4 tests)
✓ server/automation.test.ts (4 tests)
✓ server/session-security.test.ts (2 tests)
✓ server/auth.logout.test.ts (1 test)
✓ server/role-change.transaction.test.ts (2 tests)
✓ server/demo.test.ts (4 tests)
✓ server/cases.router.test.ts (9 tests)
✓ server/inbound-intelligence.test.ts (10 tests)
✓ server/role-access.test.ts (5 tests)

Test Files  11 passed (11)
     Tests  47 passed (47)
```

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.
