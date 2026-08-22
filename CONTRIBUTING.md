# Contributing to LienGuard

Thank you for your interest in contributing to **LienGuard**! LienGuard is an enterprise property lien governance and dispute resolution platform built on modern TypeScript, React 19, tRPC v11, and Drizzle ORM.

We welcome all contributions: bug fixes, performance optimizations, architectural improvements, UI enhancements, and documentation additions.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Development Setup](#development-setup)
3. [Repository Structure](#repository-structure)
4. [Branching & Workflow](#branching--workflow)
5. [Coding Standards](#coding-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Submitting a Pull Request](#submitting-a-pull-request)
8. [Reporting Issues & Feature Requests](#reporting-issues--feature-requests)

---

## Code of Conduct

All contributors and participants must adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md). Please maintain respect, empathy, and professional integrity across all project spaces.

---

## Development Setup

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **pnpm**: `v10.x` (recommended package manager)
- **MySQL / TiDB**: `v8.0+` (or compatible cloud MySQL database)

### Quickstart

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
   Update `.env` with your database credentials, JWT secret, and OAuth endpoints.

4. **Run Database Migrations**:
   ```bash
   pnpm run db:push
   ```

5. **Start the Development Server**:
   ```bash
   pnpm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

---

## Repository Structure

```
LienGuard/
├── client/                 # React 19 SPA Frontend
│   ├── public/             # Static public assets
│   └── src/
│       ├── _core/          # Global hooks, state & auth context
│       ├── components/     # UI primitives & shared layouts
│       ├── contexts/       # Theme and global UI contexts
│       ├── pages/          # Route pages (Home, Cases, Workspace, Admin)
│       ├── App.tsx         # Root application & routing
│       └── index.css       # Tailwind CSS v4 design tokens
├── server/                 # Express & tRPC v11 Backend
│   ├── _core/              # tRPC engine, cookies, OAuth, LLM proxy
│   ├── db.ts               # Drizzle database querying & transactions
│   ├── cases.ts            # Case access control & state engine
│   ├── routers.ts          # Root tRPC routers & procedures
│   └── *.test.ts           # Vitest backend integration tests
├── drizzle/                # Drizzle schema definitions & SQL migrations
├── shared/                 # Shared types, constants, and validation schemas
├── docs/                   # GitHub Pages static documentation & guides
└── .github/                # GitHub Actions CI/CD workflows
```

---

## Branching & Workflow

We follow standard **Git Flow** with Conventional Commits:

- `main`: Production-ready, stable releases.
- `feat/<feature-name>`: New features or UI components.
- `fix/<bug-description>`: Bug fixes and issue patches.
- `docs/<doc-name>`: Documentation updates.
- `refactor/<scope>`: Architectural refactoring without feature changes.

### Commit Messages

Use the [Conventional Commits](https://www.conventionalcommits.org/) convention:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

*Example*: `feat(cases): add role-based status transition validation for authorities`

---

## Coding Standards

- **TypeScript**: Strict type checking enabled (`noImplicitAny`, strict null checks).
- **Code Style**: Formatted automatically with Prettier. Run `pnpm run format` prior to committing.
- **Components**: Functional React components with hooks, typed props, and Tailwind CSS v4 classes.
- **Validation**: All server procedure inputs must be validated with Zod schemas.
- **State Management**: TanStack React Query v5 for server state, Wouter for routing.

---

## Testing Guidelines

Ensure all tests pass and static type checks succeed before submitting changes:

```bash
# Run Vitest test suite
pnpm test

# Run TypeScript compiler check
pnpm run check

# Run Prettier code formatting
pnpm run format
```

When creating new features:
1. Add corresponding unit and integration tests in `server/*.test.ts`.
2. Verify role-based access rules and edge cases.
3. Test optimistic updates and error state recovery.

---

## Submitting a Pull Request

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes (`pnpm test`) and types are clean (`pnpm run check`).
5. Push to your fork and submit a Pull Request against `main`.
6. Describe what changes were made, why, and reference any relevant issue numbers (e.g. `Fixes #42`).

---

## Reporting Issues & Feature Requests

- **Bug Reports**: Open an issue detailing the steps to reproduce, expected vs actual behavior, and environment info (Node version, browser, OS).
- **Feature Requests**: Describe the problem you are trying to solve and propose an architectural or UI solution.
- **Security Vulnerabilities**: Do **not** file public issues for security vulnerabilities. Review our [Security Policy](./SECURITY.md) for reporting guidelines.
