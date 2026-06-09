<!-- refreshed: 2026-06-09 -->
# Architecture

**Analysis Date:** 2026-06-09

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│              Cinatra Host App (Next.js monorepo)             │
│  Route: /connectors/cinatra-ai/mcp-client-registry-connector│
└─────────────┬───────────────────────────┬───────────────────┘
              │ renders                   │ invokes
              ▼                           ▼
┌─────────────────────────┐  ┌───────────────────────────────┐
│  Setup Page (RSC)       │  │  Server Action                │
│  `src/setup-page.tsx`   │  │  `src/actions.ts`             │
│  Server-only React page │  │  disconnectClaudeDesktopAction│
└────────────┬────────────┘  └──────────────┬────────────────┘
             │ calls                        │ calls
             ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Registry Core  `src/index.ts`                 │
│  listClaudeDesktopClients()  countClaudeDesktopClients()    │
│  deleteMcpOAuthClient()      McpOAuthClient type            │
│  mcpClientRegistryConnectorPackage (HostRequiredPackageDefinition) │
└─────────────────────────────┬───────────────────────────────┘
                              │ drizzle-orm sql``
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Postgres `public."oauthClient"` table                      │
│  (accessed via betterAuthDb from @/lib/better-auth-db)      │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Registry Core | DB queries, type definitions, package manifest export | `src/index.ts` |
| Setup Page | Server-rendered UI listing connected MCP clients, connection instructions | `src/setup-page.tsx` |
| Server Action | Authenticated disconnect action, system-client guard, cache revalidation | `src/actions.ts` |
| CopyMcpUrlPanel | Client component — clipboard copy of the MCP server URL | `src/copy-mcp-url-panel.tsx` |
| Button | CVA-based polymorphic button (Radix Slot, variant/size props) | `src/components/ui/button.tsx` |
| Alert | CVA-based alert with default/destructive/warning/success/info variants | `src/components/ui/alert.tsx` |
| Utils | `cn()` helper, `slugify`, `formatCurrencyMillions`, `firstName`, `quarterLabel`, `asArray`, `compareValues`, `getPageNumbers` | `src/lib/utils.ts` |

## Pattern Overview

**Overall:** Cinatra Connector Package — a source-mirror extension extracted from the Cinatra Next.js monorepo. It is a `connector` kind (declared in `package.json` under `cinatra.kind`). The package is not standalone-installable; the monorepo resolves its `@cinatra-ai/*` optional peer dependencies.

**Key Characteristics:**
- All data-access code is `server-only` (marked with `import "server-only"` at top of `src/index.ts` and `src/setup-page.tsx`)
- DB interaction uses raw `drizzle-orm` tagged `sql` template literals against an existing `betterAuthDb` connection — no ORM models are defined in this package
- UI is React 19 RSC with a single `"use client"` leaf (`src/copy-mcp-url-panel.tsx`) and a single `"use server"` action module (`src/actions.ts`)
- Component primitives use the CVA (class-variance-authority) + Tailwind CSS pattern with Radix UI Slot for polymorphism
- Authorization is delegated to `requireExtensionAction` from `@cinatra-ai/sdk-extensions`

## Layers

**Registry Core (server-only data layer):**
- Purpose: Query and mutate the `oauthClient` table; export the package manifest
- Location: `src/index.ts`
- Contains: Type definitions (`McpOAuthClient`, internal `Row`), private parse helpers, async query functions, the `HostRequiredPackageDefinition` export, a backward-compat alias
- Depends on: `drizzle-orm` (sql tag), `betterAuthDb` from host (`@/lib/better-auth-db`), `@cinatra-ai/sdk-extensions` (type import only)
- Used by: `src/setup-page.tsx`, `src/actions.ts`

**Server Action layer:**
- Purpose: Handle form submissions (disconnect MCP OAuth client); enforce auth and system-client guard
- Location: `src/actions.ts`
- Contains: `disconnectClaudeDesktopAction` (Next.js Server Action)
- Depends on: `next/cache` (revalidatePath), `@cinatra-ai/sdk-extensions` (requireExtensionAction), `src/index.ts` (deleteMcpOAuthClient)
- Used by: `src/setup-page.tsx` (passed as form `action`)

**Setup Page (RSC presentation layer):**
- Purpose: Render the connector's settings UI — MCP URL display, connection instructions, connected-client list with disconnect buttons
- Location: `src/setup-page.tsx`
- Contains: `ClaudeConnectorSetupPage` (default export, async RSC), `ConnectedClientRow` (private RSC sub-component), `summarizeRedirects` helper
- Depends on: `@cinatra-ai/sdk-ui/marketplace` (Main, PageHeader, PageContent), `src/index.ts`, `src/actions.ts`, `src/copy-mcp-url-panel.tsx`, `src/components/ui/*`
- Used by: Host app's connector dispatch route

**UI Components (presentational, no logic):**
- Purpose: Shared primitive components scoped to this package
- Location: `src/components/ui/`
- Contains: `Button` (`button.tsx`), `Alert`/`AlertTitle`/`AlertDescription` (`alert.tsx`)
- Depends on: `class-variance-authority`, `radix-ui` (Slot), `src/lib/utils.ts` (cn)
- Used by: `src/setup-page.tsx`, `src/copy-mcp-url-panel.tsx`

**Client component:**
- Purpose: Browser-side clipboard interaction for the MCP URL
- Location: `src/copy-mcp-url-panel.tsx`
- Contains: `CopyMcpUrlPanel` (`"use client"`)
- Depends on: `src/components/ui/button.tsx`, `navigator.clipboard`
- Used by: `src/setup-page.tsx`

**Utilities:**
- Purpose: Shared pure functions (className merging, string/date/number helpers)
- Location: `src/lib/utils.ts`
- Contains: `cn`, `slugify`, `formatCurrencyMillions`, `firstName`, `quarterLabel`, `asArray`, `compareValues`, `getPageNumbers`
- Depends on: `clsx`, `tailwind-merge`
- Used by: `src/components/ui/button.tsx`, `src/components/ui/alert.tsx`

## Data Flow

### Listing Connected MCP Clients

1. Host app renders `ClaudeConnectorSetupPage` (`src/setup-page.tsx`, line 80)
2. Page calls `ctx.mcp.getPublicBaseUrl()` to resolve the public MCP URL from `ExtensionHostContext`
3. Page calls `listClaudeDesktopClients()` (`src/index.ts`, line 91)
4. `listClaudeDesktopClients` calls `listExternalMcpClientRows()` which executes a raw SQL query against `public."oauthClient"` via `betterAuthDb` (`src/index.ts`, line 78–89)
5. Rows are filtered to those whose `name` contains "claude", then mapped via `toClient()` to `McpOAuthClient` objects
6. Page renders `ConnectedClientRow` for each client with a disconnect form

### Disconnecting an MCP Client

1. User submits the disconnect form in `ConnectedClientRow` (`src/setup-page.tsx`, line 64)
2. Next.js calls `disconnectClaudeDesktopAction(formData)` (`src/actions.ts`, line 12)
3. Action calls `requireExtensionAction(...)` — throws if caller lacks `"manage"` permission
4. Action validates `clientId` is non-empty and not in `SYSTEM_CLIENT_IDS` or prefixed `cinatra-llm-`
5. Action calls `deleteMcpOAuthClient(clientId)` → raw SQL `DELETE` against `public."oauthClient"` (`src/index.ts`, line 103–107)
6. Action calls `revalidatePath` for the setup page and `/connectors` to bust Next.js cache

## Key Abstractions

**McpOAuthClient:**
- Purpose: Typed representation of an external OAuth client row from the DB
- Examples: `src/index.ts` (lines 25–32)
- Pattern: Plain TypeScript interface; raw DB `Row` is an internal type, only `McpOAuthClient` is exported

**HostRequiredPackageDefinition (mcpClientRegistryConnectorPackage):**
- Purpose: Package manifest describing this connector to the Cinatra host — packageId, name, slug, description, settingsHref
- Examples: `src/index.ts` (lines 12–19)
- Pattern: Single exported const; backward-compat alias `claudeDesktopConnectorPackage` also exported

**ExtensionHostContext (ctx):**
- Purpose: Host-provided context passed to the setup page — exposes `ctx.mcp.getPublicBaseUrl()` for the MCP URL
- Examples: `src/setup-page.tsx` (lines 13–21)
- Pattern: Type imported from `@cinatra-ai/sdk-extensions`; the connector consumes it, never implements it

## Entry Points

**Package public API:**
- Location: `src/index.ts`
- Triggers: Imported by the Cinatra host monorepo
- Responsibilities: Exports `mcpClientRegistryConnectorPackage`, `claudeDesktopConnectorPackage` (alias), `McpOAuthClient` type, `listClaudeDesktopClients`, `countClaudeDesktopClients`, `deleteMcpOAuthClient`

**Setup Page:**
- Location: `src/setup-page.tsx` (default export `ClaudeConnectorSetupPage`)
- Triggers: Rendered by the host app at `/connectors/cinatra-ai/mcp-client-registry-connector/setup`
- Responsibilities: Full settings UI for the connector — MCP URL display, how-to-connect steps, connected client list with disconnect

**Server Action:**
- Location: `src/actions.ts` (named export `disconnectClaudeDesktopAction`)
- Triggers: HTML form submission from `ConnectedClientRow`
- Responsibilities: Auth guard, system-client guard, deletion, cache revalidation

## Architectural Constraints

- **Server-only boundary:** `src/index.ts` and `src/setup-page.tsx` both import `"server-only"` — they must never be imported from client components
- **Source mirror:** This repo is extracted from the Cinatra monorepo. `@cinatra-ai/*` peers (`sdk-extensions`, `sdk-ui`) are declared `optional` peerDependencies and are NOT resolved standalone — the monorepo provides them
- **No ORM schema:** The `oauthClient` table is owned by `better-auth` in the host; this package issues raw SQL — no Drizzle schema/migrations live here
- **Global state:** None — all state is in the database; no module-level singletons beyond `SYSTEM_CLIENT_IDS` Set in `src/actions.ts`
- **Circular imports:** None detected
- **requestedHostPorts:** Declares `["mcp"]` in `package.json` — the host must provide an `mcp` port for `ctx.mcp.getPublicBaseUrl()` to resolve

## Anti-Patterns

### Aliasing deprecated export name

**What happens:** `claudeDesktopConnectorPackage` is re-exported from `src/index.ts` as an alias for `mcpClientRegistryConnectorPackage`
**Why it's wrong:** Callers depending on the alias will not update to the canonical name, creating long-lived dead weight
**Do this instead:** Update all call sites in the monorepo to import `mcpClientRegistryConnectorPackage` and remove the alias (`src/index.ts`, line 23)

## Error Handling

**Strategy:** Exceptions bubble — no try/catch in the public API functions. Parse helpers (`parseRedirectURLs`, `parseDate`) handle malformed data defensively and return safe fallbacks (empty array, null).

**Patterns:**
- `parseRedirectURLs` catches `JSON.parse` errors silently and returns `[]`
- `summarizeRedirects` catches `new URL()` parse errors silently
- `disconnectClaudeDesktopAction` throws `Error` for missing/invalid `clientId` — Next.js server action error boundary handles display

## Cross-Cutting Concerns

**Logging:** None — no logging framework; errors throw or are silently swallowed in parse helpers
**Validation:** Inline in `disconnectClaudeDesktopAction` (empty check, system-client blocklist)
**Authentication:** Delegated to `requireExtensionAction("@cinatra-ai/mcp-client-registry-connector", "manage")` from `@cinatra-ai/sdk-extensions`

---

*Architecture analysis: 2026-06-09*
