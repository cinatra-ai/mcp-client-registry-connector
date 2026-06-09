# Testing Patterns

**Analysis Date:** 2026-06-09

## Test Framework

**Runner:**
- Vitest (configured via `package.json` `scripts.test: "vitest"`)
- No `vitest.config.*` file detected — Vitest runs with default configuration

**Assertion Library:**
- Vitest built-in (expect/assertions from vitest)

**Run Commands:**
```bash
npm test          # Run all tests (vitest)
```

## Test File Organization

**Location:**
- No test files exist in the repository at this time. The `vitest` script is declared in `package.json` but no `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files are present under `src/`.

**Naming:**
- Convention not yet established (no examples). Vitest default discovery (`**/*.{test,spec}.{ts,tsx}`) would apply.

**Structure:**
- Not applicable — no tests written yet.

## Test Structure

**Suite Organization:**
- Not applicable — no tests written yet.

**Patterns:**
- Not applicable — no tests written yet.

## Mocking

**Framework:** Not applicable — no tests written yet.

**What to Mock (guidance based on codebase structure):**
- `betterAuthDb` (imported via `@/lib/better-auth-db`) — external DB dependency; must be mocked in unit tests of `src/index.ts`
- `requireExtensionAction` from `@cinatra-ai/sdk-extensions` — auth gate in `src/actions.ts`; mock to bypass or assert permission checks
- `revalidatePath` from `next/cache` — Next.js cache invalidation side effect in `src/actions.ts`

**What NOT to Mock:**
- Pure utility functions in `src/lib/utils.ts` (`cn`, `slugify`, `parseRedirectURLs`, `parseDate`, etc.) — test these directly

## Fixtures and Factories

**Test Data:**
- Not applicable — no tests written yet. When added, `McpOAuthClient` objects (defined in `src/index.ts`) are the primary data shape to fixture.

**Location:**
- No fixture directory established. Suggest co-locating with test files or a `src/__fixtures__/` directory.

## Coverage

**Requirements:** Not enforced — no coverage thresholds configured.

**View Coverage:**
```bash
npx vitest run --coverage    # Generate coverage report (requires @vitest/coverage-v8 or similar)
```

## Test Types

**Unit Tests:**
- Target scope: pure utility functions in `src/lib/utils.ts` (`parseRedirectURLs`, `parseDate`, `summarizeRedirects`, `slugify`, `cn`, etc.) — these have no external dependencies and are immediately testable.

**Integration Tests:**
- Would require mocking `betterAuthDb` to test `listClaudeDesktopClients`, `countClaudeDesktopClients`, and `deleteMcpOAuthClient` in `src/index.ts`.
- Would require mocking `requireExtensionAction` and `revalidatePath` to test `disconnectClaudeDesktopAction` in `src/actions.ts`.

**E2E Tests:**
- Not configured. No Playwright or Cypress setup detected.

## Common Patterns

**Async Testing:**
- Not established. When added, use Vitest's native async/await support: `it('...', async () => { ... })`.

**Error Testing:**
- Not established. For server action validation (e.g., missing `clientId`), use `await expect(fn()).rejects.toThrow("Missing clientId")`.

## Notes

This package declares `vitest` as the test runner but contains zero test files. The codebase is small (7 source files) with significant pure-function logic in `src/lib/utils.ts` and `src/index.ts` that is well-suited for unit testing. The highest-value test targets are:

1. `parseRedirectURLs` — handles JSON parsing edge cases (array, string, malformed)
2. `parseDate` — handles `Date`, string, and null inputs
3. `summarizeRedirects` — localhost port extraction logic
4. `disconnectClaudeDesktopAction` — guard logic (missing clientId, system client IDs, `cinatra-llm-` prefix)

---

*Testing analysis: 2026-06-09*
