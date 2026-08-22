# LienGuard Hosting Handoff

This repository contains the **complete LienGuard application**: the React frontend, Express/tRPC backend, Drizzle migrations, protected-document integration, Maileroo integration, deadline automation, tests, and the local demonstration mode. The credential-free delivery archive contains the same committed source and does not include production secrets.

> GitHub Pages publishes only the `docs/` directory. It is therefore a documentation site, not the running LienGuard application. A full deployment must run the Node server and connect it to a MySQL-compatible database.

## Choose the hosting shape

| Hosting shape | What it runs | Suitable for | Important limitation |
|---|---|---|---|
| **Full-stack Node host** | React build, Express/tRPC API, OAuth callback, webhooks, scheduler route, and MySQL connection | The actual LienGuard application | Requires a server-capable provider, MySQL, and a server-side secret store. |
| **Docker-capable host** | The same complete Node application from the included `Dockerfile` | Providers that accept a Docker image | Still requires the database, public HTTPS URL, and runtime environment variables. |
| **Vercel static frontend** | Only `dist/public` from the React/Vite build | A visual frontend preview | It cannot operate secure sign-in, case data, documents, Maileroo, inbound replies, or deadline automation by itself. |
| **GitHub Pages** | Documentation content from `docs/` | Project documentation | It is not the LienGuard frontend deployment. |

## Recommended complete deployment

Use a host that can run a Node process continuously or on HTTP requests, then connect a managed MySQL-compatible database. The required project commands are shown below.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

The application honours `PORT`, so the hosting provider can supply its own listening port. The included `Dockerfile` builds the frontend and server into a production image; providers that support Docker can use it without any additional source files.

Before opening the deployment publicly, create a database backup and apply the committed migrations, including `drizzle/0006_mail_delivery_and_deadline_automation.sql`.

```bash
pnpm drizzle-kit migrate
```

## Server-side environment variables

Start from `.env.example`, but enter real values **only in the selected host’s secret/environment-variable panel**. Do not create or commit a production `.env` file. The required settings are grouped below so the deployment can be configured without copying secrets into source control.

| Group | Required values | Notes |
|---|---|---|
| Core runtime | `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `JWT_SECRET` | `JWT_SECRET` must be a new random value of at least 32 characters. |
| OAuth | `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID` | OAuth callback URI must match the public HTTPS deployment URL. |
| Protected document storage | `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY` or the deployment’s supported protected-storage configuration | Configure only when protected uploads/downloads are required. |
| Controlled email demo | `MAILEROO_*`, `AUTOMATION_SECRET`, `EMAIL_DELIVERY_MODE=demo`, `DEMO_EMAIL_RECIPIENTS` | Keep delivery in `demo` mode with exactly the approved controlled recipient. Never use `live` mode for the demonstration. |
| Inbound Maileroo reply flow | `MAILEROO_INBOUND_DOMAIN`, public HTTPS webhook URL | Configure provider-side inbound routing only after the full Node application is publicly deployed. |
| Deadline automation | `AUTOMATION_SECRET`, public scheduler URL | The scheduler is protected and should run only after the database and environment are live. |

## Vercel guidance

Vercel can be used for a **static preview** of the React frontend by building the project and publishing `dist/public`. That preview will not be a complete LienGuard environment because the app’s protected routes depend on server-side tRPC procedures, a database, authentication, and server-only configuration.

For a complete Vercel-based architecture, deploy the backend/API on a compatible server runtime with the database and secrets, then configure the frontend to call that backend through a deliberately reviewed API-origin setup. This repository currently keeps the API and frontend together in one Express application, so the simplest complete deployment is a Node or Docker-capable host rather than a static-only provider.

## Safe deployment order

First deploy the application with email delivery disabled and verify the secure sign-in, role access, case CRUD, and database migrations. Next configure protected storage if it is required. Only then configure the controlled Maileroo demo with one approved recipient, the provider’s inbound route, and the protected scheduler. Use `docs/controlled_demo_acceptance_test.md` for the full email-reply acceptance sequence.

## Local demonstration before deployment

The package also contains a self-contained visual demo that does not need OAuth, Maileroo, or a production database.

```bash
pnpm demo:local
```

It creates an isolated local MariaDB database, applies the migrations, seeds three clearly labelled local-only case records, and starts the app. Email delivery remains disabled. See `docs/local_demo.md` for the safety boundary and visible demo routes.

## Delivery contents

| Path | Contents |
|---|---|
| `client/` | React, Vite, Tailwind frontend and all workspace screens. |
| `server/` | Express/tRPC API, authorization, cases, storage, Maileroo, webhooks, and scheduler code. |
| `drizzle/` | Current schema and every database migration, including migration `0006`. |
| `docs/` | Controlled email, local demo, production email automation, and deployment documentation. |
| `scripts/` | Configuration checks, local demo launcher, and realistic local seed data. |
| `.env.example` | Credential-free environment-variable template. |
| `Dockerfile` | Production image definition for a Docker-capable host. |

No SMTP password, signing secret, database password, OAuth token, or API key is included in the source or package.
