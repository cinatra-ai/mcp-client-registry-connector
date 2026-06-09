# Codebase Structure

**Analysis Date:** 2026-06-09

## Directory Layout

```
mcp-client-registry-connector/
├── src/
│   ├── index.ts                  # Package public API — registry core, type exports, package manifest
│   ├── actions.ts                # Next.js Server Action — disconnect MCP OAuth client
│   ├── setup-page.tsx            # RSC setup page rendered by host at connector settings route
│   ├── copy-mcp-url-panel.tsx    # "use client" clipboard copy panel for MCP URL
│   ├── components/
│   │   └── ui/
│   │       ├── button.tsx        # CVA Button primitive (Radix Slot, variant/size)
│   │       └── alert.tsx         # CVA Alert primitive (default/destructive/warning/success/info)
│   └── lib/
│       └── utils.ts              # Shared pure helpers: cn(), slugify, formatters, pagination
├── .github/
│   └── workflows/
│       ├── ci.yml                # CI: build, typecheck, test, pack dry-run; mirror-gate logic
│       └── release.yml           # Release workflow
├── package.json                  # Package manifest + Cinatra connector metadata
├── tsconfig.json                 # Standalone TS config (targets src/, emits to dist/)
├── .npmrc                        # npm registry config
└── LICENSE                       # Apache-2.0
```

## Directory Purposes

**`src/`:**
- Purpose: All source code for the connector package
- Contains: Server-only registry logic, RSC pages, server actions, client components, UI primitives, utilities
- Key files: `src/index.ts` (public API entry), `src/setup-page.tsx` (UI), `src/actions.ts` (mutations)

**`src/components/ui/`:**
- Purpose: Local CVA-based UI primitives scoped to this package
- Contains: `button.tsx`, `alert.tsx`
- Note: These are not re-exported from `src/index.ts` — internal use only within the package's own RSC pages

**`src/lib/`:**
- Purpose: Shared utility functions with no side effects
- Contains: `utils.ts` — `cn()` (Tailwind class merge), `slugify`, `formatCurrencyMillions`, `firstName`, `quarterLabel`, `asArray`, `compareValues`, `getPageNumbers`

**`.github/workflows/`:**
- Purpose: CI/CD automation
- Contains: `ci.yml` (build + mirror-gate), `release.yml` (publish)

## Key File Locations

**Entry Points:**
- `src/index.ts`: Package public API — all exported types and functions consumed by the Cinatra monorepo host

**Configuration:**
- `package.json`: npm package config + `cinatra` metadata block (kind: connector, requestedHostPorts: ["mcp"])
- `tsconfig.json`: Standalone TypeScript config — `rootDir: src`, `outDir: dist`, `strict: true`, `noImplicitAny: false`
- `.npmrc`: npm registry settings

**Core Logic:**
- `src/index.ts`: DB queries (`listClaudeDesktopClients`, `countClaudeDesktopClients`, `deleteMcpOAuthClient`), type definitions (`McpOAuthClient`), package manifest const
- `src/actions.ts`: `disconnectClaudeDesktopAction` — the only mutation surface accessible from the UI

**UI / Presentation:**
- `src/setup-page.tsx`: Full connector settings page (RSC, server-only)
- `src/copy-mcp-url-panel.tsx`: Clipboard copy panel (client component)

**Testing:**
- Not present in this repo — tests run in the Cinatra monorepo (source mirror pattern; CI skips standalone test when `@cinatra-ai/*` peers are declared)

## Naming Conventions

**Files:**
- kebab-case for all filenames: `setup-page.tsx`, `copy-mcp-url-panel.tsx`, `utils.ts`
- UI primitives named after their primary component: `button.tsx`, `alert.tsx`
- Action files use the suffix `-actions` or `actions.ts` at top level of `src/`

**Directories:**
- `components/ui/` for CVA primitive components
- `lib/` for pure utility modules

**Exports:**
- Types: PascalCase — `McpOAuthClient`, `ConnectorSetupPageProps`
- Functions: camelCase — `listClaudeDesktopClients`, `deleteMcpOAuthClient`, `disconnectClaudeDesktopAction`
- Constants/package manifests: camelCase with descriptive suffix — `mcpClientRegistryConnectorPackage`

## Where to Add New Code

**New DB query or mutation:**
- Implementation: `src/index.ts` — add as a named async function, export if host-facing
- Guard with `import "server-only"` (already at top of file)

**New server action (form mutation):**
- Implementation: `src/actions.ts` — add `"use server"` directive is already at file top; add named export
- Always call `requireExtensionAction(packageId, permission)` before any mutation

**New RSC page section or sub-component:**
- Implementation: `src/setup-page.tsx` — add as a private function component (no export needed if only used in this file)
- For a separate page: create a new `src/*-page.tsx` file following the same `server-only` + default-export RSC pattern

**New client component:**
- Implementation: `src/*.tsx` at `src/` root, with `"use client"` directive at the top
- No subdirectory needed for one-off client components; `src/components/` is reserved for reusable UI primitives

**New UI primitive:**
- Implementation: `src/components/ui/<name>.tsx` — use CVA + `cn()` pattern; import `cn` from `../../lib/utils`

**New utility function:**
- Shared helpers: `src/lib/utils.ts` — pure functions only, no side effects, no imports from `src/index.ts`

## Special Directories

**`dist/`:**
- Purpose: TypeScript compilation output
- Generated: Yes (by `tsc`)
- Committed: No (not present in repo)

**`.planning/codebase/`:**
- Purpose: GSD codebase map documents
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Typically yes (planning artifacts)

---

*Structure analysis: 2026-06-09*
