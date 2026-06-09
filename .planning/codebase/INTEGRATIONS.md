# External Integrations

**Analysis Date:** 2026-06-09

## APIs & External Services

**Model Context Protocol (MCP):**
- MCP server endpoint - This connector does NOT implement MCP itself; it manages the registry of external MCP clients that connect TO the Cinatra host's MCP server
  - The public MCP URL is consumed via `ctx.mcp.getPublicBaseUrl()` from `ExtensionHostContext` (host-provided)
  - Displayed URL pattern: `{publicBaseUrl}/api/mcp`
  - Supported clients: Claude Desktop, Claude.ai, ChatGPT, any MCP-compatible client

**Cinatra SDK:**
- `@cinatra-ai/sdk-extensions` - Extension host abstraction
  - `requireExtensionAction(packageId, permission)` - Authorization gate in `src/actions.ts`
  - `HostRequiredPackageDefinition` - Connector registration type in `src/index.ts`
  - `ExtensionHostContext` + `ctx.mcp` - Host context injected into `src/setup-page.tsx`
- `@cinatra-ai/sdk-ui` - UI layout components
  - Import path: `@cinatra-ai/sdk-ui/marketplace`
  - Components used: `Main`, `PageHeader`, `PageContent` in `src/setup-page.tsx`

## Data Storage

**Databases:**
- PostgreSQL (via `betterAuth` OAuth client table)
  - Connection: Provided by host via `@/lib/better-auth-db` path alias; this package does not manage the connection directly
  - Client: `drizzle-orm` with raw SQL (`sql` tagged template)
  - Table: `public."oauthClient"` - queried and mutated directly in `src/index.ts`
  - Operations:
    - SELECT: list external MCP OAuth clients (filtered to exclude Cinatra system clients)
    - DELETE: remove an OAuth client by `clientId` (`deleteMcpOAuthClient`)

**File Storage:**
- Not applicable

**Caching:**
- Next.js cache invalidation via `revalidatePath` (`src/actions.ts`) — refreshes `/connectors/cinatra-ai/mcp-client-registry-connector/setup` and `/connectors` after disconnect

## Authentication & Identity

**Auth Provider:**
- BetterAuth (host-managed)
  - This connector queries the `oauthClient` table managed by BetterAuth on the host
  - The `disconnectClaudeDesktopAction` in `src/actions.ts` enforces `requireExtensionAction` authorization before any mutation
  - System client IDs guarded against deletion: `cinatra-app-mcp-client`, any ID matching `cinatra-llm-*`

## Monitoring & Observability

**Error Tracking:**
- Not detected

**Logs:**
- No explicit logging in source files; relies on host application logging

## CI/CD & Deployment

**Hosting:**
- Deployed as a Cinatra connector within the host Next.js application

**CI Pipeline:**
- `.github/workflows/` directory present (pipeline details not read)

## Environment Configuration

**Required env vars:**
- None declared directly in this package; all runtime configuration (database URL, MCP public base URL) is provided by the Cinatra host environment

**Secrets location:**
- No `.env` files present in this package; secrets are managed by the host

## Webhooks & Callbacks

**Incoming:**
- Not applicable — this package does not expose HTTP endpoints; the MCP OAuth callback is handled by the host

**Outgoing:**
- Not applicable

## External URLs Referenced

- `https://code.claude.com/docs/en/desktop-quickstart` - Claude Desktop download link shown in `src/setup-page.tsx` setup instructions (static link in UI only)

---

*Integration audit: 2026-06-09*
