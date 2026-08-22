# Vercel Static Frontend Correction

## Why the deployment showed TypeScript/JavaScript source

The affected Vercel deployment served the compiled `server/_core/index.ts` file at `/` with `Content-Type: application/javascript`. That file is the Express/tRPC server bundle, not an HTML frontend. Browsers therefore displayed its source text instead of loading the LienGuard interface.

The repository now contains `vercel.json`, which corrects the deployment target:

| Setting | Correct value | Reason |
|---|---|---|
| Install command | `pnpm install --frozen-lockfile` | Installs the locked project dependencies. |
| Build command | `VITE_STATIC_PREVIEW=true pnpm build` | Builds the React/Vite interface in clearly labelled static-preview mode. |
| Output directory | `dist/public` | This is the generated frontend directory. It contains `index.html`, CSS, and JavaScript assets. |
| Rewrite | `/(.*)` → `/index.html` | Allows frontend routing to load the Vite application rather than a missing static file. |

## What will appear after redeployment

The root URL will show the LienGuard landing interface with a **View frontend preview** action. That action opens an interface preview containing the case register, escalation workflow, status indicators, and clear labels that the secure backend is not connected.

> The static preview intentionally does not show a fake sign-in or claim that it can send email, retrieve documents, accept Maileroo replies, run deadline automation, or load real cases.

## Deploy or redeploy on Vercel

The correct source is committed to the repository. In the Vercel project settings, leave the project root at the repository root and use the values already provided by `vercel.json`. Do not set the Output Directory to `server/_core/index.ts`, `dist/index.js`, or any server file.

After the next Git commit is pushed, a connected Vercel project should create a new deployment automatically. If it does not, open the project’s Deployments page and redeploy the newest commit without using the previous deployment’s output settings.

## Full application requirement

A static Vercel deployment is only a visual frontend. The complete LienGuard application needs the Express/tRPC server, a MySQL-compatible database, server-side secrets, OAuth callback configuration, storage integration, and a public HTTPS webhook endpoint. Use `HOSTING_HANDOFF.md` for the complete Node/Docker hosting path.
