# Technology Stack

**Analysis Date:** 2026-06-09

## Languages

**Primary:**
- TypeScript (strict mode) - All source files under `src/`

**Secondary:**
- TSX - React components (`src/setup-page.tsx`, `src/copy-mcp-url-panel.tsx`, `src/components/ui/`)

## Runtime

**Environment:**
- Node.js (ESM-only package; `"type": "module"` in `package.json`)
- Target: ES2023 (set in `tsconfig.json`)

**Package Manager:**
- npm (`.npmrc` present with `auto-install-peers=false`)
- Lockfile: Not detected in repo root (likely managed by host monorepo)

## Frameworks

**Core:**
- React 19 (peer dependency) - UI component rendering

**UI Utilities:**
- `class-variance-authority` ^0.7.1 - Variant-based className composition (`src/components/ui/button.tsx`, `src/components/ui/alert.tsx`)
- `clsx` ^2.1.1 - Conditional class merging (`src/lib/utils.ts`)
- `tailwind-merge` ^3.5.0 - Tailwind class deduplication (`src/lib/utils.ts`)
- `radix-ui` ^1.4.3 - Accessible UI primitives (used by alert/button components)

**ORM:**
- `drizzle-orm` ^0.45.2 - Database query builder; used with raw SQL via `sql` tagged template in `src/index.ts`

**Testing:**
- vitest - Test runner (configured via `"test": "vitest"` in `package.json`; no config file detected)

**Build/Dev:**
- TypeScript compiler (`tsc`) via `tsconfig.json`
- Output: `dist/` directory
- Source maps and declaration maps enabled

## Key Dependencies

**Critical:**
- `drizzle-orm` ^0.45.2 - Used for all database access; raw SQL executed against `betterAuthDb` connection imported from host (`@/lib/better-auth-db`)
- `@cinatra-ai/sdk-extensions` (peer, optional) - Provides `HostRequiredPackageDefinition`, `ExtensionHostContext`, `requireExtensionAction` — core SDK types for Cinatra connector registration and auth
- `@cinatra-ai/sdk-ui` (peer, optional) - Provides `Main`, `PageHeader`, `PageContent` layout components from `@cinatra-ai/sdk-ui/marketplace`

**Infrastructure:**
- `react` ^19.2.3 (peer) - Required for JSX rendering
- `react-dom` ^19.2.3 (peer) - Required for DOM rendering

## Configuration

**Environment:**
- No `.env` files detected in this package; runtime environment variables are resolved by the host application
- Database connection (`betterAuthDb`) is imported from the host via `@/lib/better-auth-db` path alias

**Build:**
- `tsconfig.json` - Standalone strict TypeScript config; targets `src/`, outputs to `dist/`, uses `moduleResolution: bundler`, enables `verbatimModuleSyntax`
- `package.json` - Declares `cinatra` manifest block with `apiVersion: cinatra.ai/v1`, `kind: connector`, `requestedHostPorts: ["mcp"]`
- `.npmrc` - Sets `auto-install-peers=false`
- `.github/workflows/` - CI workflow directory (contents not read)

## Platform Requirements

**Development:**
- Node.js with ESM support
- Host must supply `@cinatra-ai/sdk-extensions`, `@cinatra-ai/sdk-ui`, and `@/lib/better-auth-db` via path alias or workspace linkage

**Production:**
- Deployed as part of the Cinatra host application
- Requires Next.js server environment (uses `"use server"` and `revalidatePath` from `next/cache` in `src/actions.ts`, and `"server-only"` guard in `src/index.ts`)
- MCP host port must be provisioned (`requestedHostPorts: ["mcp"]`)

---

*Stack analysis: 2026-06-09*
