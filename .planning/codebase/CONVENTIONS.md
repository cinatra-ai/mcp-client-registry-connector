# Coding Conventions

**Analysis Date:** 2026-06-09

## Naming Patterns

**Files:**
- React page components: PascalCase, `setup-page.tsx`, `copy-mcp-url-panel.tsx` (kebab-case for multi-word)
- UI primitives: `src/components/ui/alert.tsx`, `src/components/ui/button.tsx` (kebab-case, singular nouns)
- Utility modules: `src/lib/utils.ts`
- Server actions: `src/actions.ts` (flat, not nested under component dir)
- Entry point: `src/index.ts`

**Functions:**
- camelCase for utilities: `parseRedirectURLs`, `parseDate`, `toClient`, `summarizeRedirects`
- camelCase for React components: `ConnectedClientRow`, `CopyMcpUrlPanel`, `ClaudeConnectorSetupPage`
- Server actions use `Action` suffix: `disconnectClaudeDesktopAction`
- Data-fetching functions use verb+noun: `listClaudeDesktopClients`, `countClaudeDesktopClients`, `deleteMcpOAuthClient`
- Private helpers are module-scoped (not exported): `listExternalMcpClientRows`, `parseDate`, `toClient`

**Variables:**
- camelCase throughout
- Constants: SCREAMING_SNAKE_CASE for module-level sets: `SYSTEM_CLIENT_IDS`

**Types:**
- PascalCase for exported types: `McpOAuthClient`, `ConnectorSetupPageProps`
- Internal-only types use `type` (not `interface`): `Row` in `src/index.ts`
- `type` keyword preferred over `interface` for all type aliases

## Code Style

**Formatting:**
- Not detected (no `.prettierrc` or `biome.json` present). `.npmrc` present but contains only registry config.

**Linting:**
- Not detected (no `.eslintrc` or `eslint.config.*` found).

**TypeScript config (`tsconfig.json`):**
- `strict: true` enabled
- `noImplicitAny: false` (relaxed — explicit `any` disallowed implicitly but not enforced strictly)
- `verbatimModuleSyntax: true` — all imports of types must use `import type`
- `isolatedModules: true`
- Target: `ES2023`, module: `ESNext`, moduleResolution: `bundler`
- `jsx: react-jsx` (no React import needed in TSX files)

## Import Organization

**Order (observed pattern):**
1. Directive strings (`"use server"`, `"server-only"`) at top of file
2. External library imports
3. Internal imports using relative paths

**Path Aliases:**
- `@/lib/better-auth-db` alias used in `src/index.ts` — resolves to host application's lib, not this package's `src/lib/`
- Otherwise relative imports are used: `../../lib/utils`, `./components/ui/button`

**`import type` usage:**
- Required by `verbatimModuleSyntax`. Applied consistently: `import type { HostRequiredPackageDefinition }`, `import type { McpOAuthClient }`, `import type { ExtensionHostContext }`

## Error Handling

**Patterns:**
- Functions that can fail silently return fallback values rather than throwing: `parseRedirectURLs` returns `[]` on parse error, `parseDate` returns `null` on invalid input
- Empty `catch` blocks used for expected/ignorable errors: `catch { return []; }` in `parseRedirectURLs`, `catch { /* ignore unparseable URI */ }` in `summarizeRedirects`
- Server actions throw `Error` with descriptive messages for validation failures: `throw new Error("Missing clientId")`, `throw new Error("This OAuth client is system-managed...")`
- No try/catch around DB calls in `src/actions.ts` — errors propagate to Next.js error boundary

## Logging

**Framework:** None detected — no logger import or `console.*` calls in source.

## Comments

**When to Comment:**
- Module-level block comments explain the package's boundary and non-obvious constraints (e.g., the comment in `src/index.ts` distinguishing this package from `@cinatra-ai/anthropic-connector`)
- Inline comments explain architectural decisions, backward-compat aliases, and ABI contracts (e.g., `// Backward-compat alias`, `// getPublicBaseUrl is optional by ABI contract`)
- No JSDoc/TSDoc annotations detected

## Function Design

**Size:** Small, single-purpose functions. Longest function is `ClaudeConnectorSetupPage` (~100 lines) — a React component, not a utility.

**Parameters:** Prefer destructured props for React components. Server actions accept `FormData` (Next.js convention). Pure utility functions accept primitives.

**Return Values:**
- Async data functions return `Promise<T>` with explicit return types declared
- Utilities return `string | null` or `string[]` (never `undefined` where `null` is the sentinel)
- React components return JSX

## Module Design

**Exports:**
- `src/index.ts` is the package entry point; exports types, constants, and async data functions
- `src/actions.ts` exports only the server action (`disconnectClaudeDesktopAction`)
- `src/setup-page.tsx` has a default export (the page component)
- UI components use named exports: `export { Alert, AlertTitle, AlertDescription }`, `export { Button, buttonVariants }`

**Barrel Files:**
- Not used for UI components — each component file exports directly and consumers import from the file path

## React Patterns

**Server vs. Client Components:**
- `"server-only"` guard in `src/index.ts` prevents client-side import of DB code
- `"use client"` directive at top of `src/components/ui/alert.tsx` and `src/copy-mcp-url-panel.tsx`
- `"use server"` directive at top of `src/actions.ts`
- Default page export in `src/setup-page.tsx` is an async server component (no directive needed; `"server-only"` import enforces it)

**Styling:**
- Tailwind CSS utility classes throughout
- `cn()` helper from `src/lib/utils.ts` (clsx + tailwind-merge) used in all components for conditional class merging
- CVA (`class-variance-authority`) used for variant-based component styling in `alert.tsx` and `button.tsx`
- Design token CSS variables used directly in classes: `border-line`, `bg-surface`, `text-muted-foreground`, etc.

---

*Convention analysis: 2026-06-09*
