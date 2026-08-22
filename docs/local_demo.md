# Local Demonstration Workspace

The local demonstration mode is a **development-only visual walkthrough** for LienGuard. It exists so the protected application can be shown without relying on a deployed database, Manus OAuth configuration, Maileroo credentials, external email, or an inbound webhook endpoint.

> This mode is not a production authentication method and is not an email test. It is intentionally disabled unless `LOCAL_DEMO_MODE=true` is set while `NODE_ENV` is not `production`.

## Start the demonstration

Run the following command from the repository root:

```bash
pnpm demo:local
```

The launcher starts a local MariaDB service if necessary, provisions the isolated `lienguard_local_demo` database, applies every committed Drizzle migration through `0006`, seeds an administrator account plus three demonstration cases, and runs the development server. The generated database and session credentials are local and ephemeral to the process. Nothing is written to source control.

Open the URL printed by the server, normally `http://localhost:3000`, and select **Open local demo workspace**. Direct visits to `/cases`, `/cases/LG-DEMO-ESC-001`, `/communications`, `/timeline`, `/documents`, `/escalations`, `/rti`, and `/admin/users` offer the same local-demo entry screen when no session exists.

## What is seeded

| Item | Local demonstration content | Purpose |
|---|---|---|
| `LG-DEMO-ESC-001` | Escalated overdue response with immutable activity history | Shows deadline, escalation, communication, timeline, and RTI eligibility controls. |
| `LG-DEMO-REV-002` | Under-review lien-verification record | Shows an active investigation posture. |
| `LG-DEMO-AWAIT-003` | Awaiting-response urgent follow-up | Shows authority routing and response tracking. |
| Communications | Clearly labelled **local-only simulations** | Shows how outbound and inbound records render without representing them as actual messages. |
| Automation records | Follow-up and escalation idempotency records | Shows the workflow state without executing a scheduler or contacting an outside service. |

## Safety boundary

| Capability | Local demonstration behavior |
|---|---|
| Authentication | A short-lived, http-only local session is issued only when `LOCAL_DEMO_MODE=true` and never in production. Production keeps the normal Manus OAuth flow. |
| Database | Uses a separate local MariaDB database named `lienguard_local_demo`. No production database URL is used or stored. |
| Email | `EMAIL_DELIVERY_MODE=disabled`; no SMTP credentials are configured, and no email can be sent. |
| Inbound email | No Maileroo webhook is configured or invoked. Inbound-looking records are explicitly labelled simulations. |
| Documents | Document metadata and upload controls remain protected by the ordinary authorization procedures. Storage-dependent uploads require a separately configured storage service and are not faked. |
| RTI | RTI remains review/draft-only; this mode does not file or send any RTI externally. |

## Real controlled email demonstration

The separate controlled-email acceptance flow remains documented in `docs/controlled_demo_acceptance_test.md`. It requires a real server-side secret store, a migrated non-demo database, a publicly reachable HTTPS deployment, and `EMAIL_DELIVERY_MODE=demo` with exactly the single approved recipient. Do not switch to `live` mode for a demonstration.
