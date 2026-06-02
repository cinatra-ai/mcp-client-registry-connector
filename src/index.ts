import "server-only";

// This package owns the inbound MCP-client registry. It is not an Anthropic API
// integration; it tracks Claude Desktop / Claude.ai / ChatGPT / any other
// MCP-compatible client that connected TO this Cinatra instance via OAuth.
// Anthropic API connection code lives in @cinatra-ai/anthropic-connector.

import { sql } from "drizzle-orm";
import { betterAuthDb } from "@/lib/better-auth-db";
import type { HostRequiredPackageDefinition } from "@cinatra-ai/sdk-extensions";

export const mcpClientRegistryConnectorPackage: HostRequiredPackageDefinition = {
  packageId: "@cinatra-ai/mcp-client-registry-connector",
  name: "Claude Desktop",
  slug: "connector-mcp-client-registry",
  description:
    "Inbound MCP-client registry: tracks Claude Desktop / Claude.ai / ChatGPT / any other MCP-compatible client that connected TO this Cinatra instance.",
  settingsHref: "/connectors/cinatra-ai/mcp-client-registry-connector/setup",
};

// Backward-compat alias so callers that still reference the legacy name compile
// while their imports are updated.
export const claudeDesktopConnectorPackage = mcpClientRegistryConnectorPackage;

export type McpOAuthClient = {
  id: string;
  clientId: string;
  name: string | null;
  redirectURLs: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
};

type Row = {
  id: string;
  clientId: string;
  name: string | null;
  redirectUris: unknown;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
};

function parseRedirectURLs(value: unknown): string[] {
  if (Array.isArray(value))
    return value.filter((entry): entry is string => typeof entry === "string");
  if (typeof value !== "string" || value.length === 0) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

function parseDate(value: Date | string | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toClient(row: Row): McpOAuthClient {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name,
    redirectURLs: parseRedirectURLs(row.redirectUris),
    createdAt: parseDate(row.createdAt),
    updatedAt: parseDate(row.updatedAt),
  };
}

// Excludes Cinatra's own internal OAuth clients (the app's self-client, assistant
// users, and per-LLM-provider clients) so we only count externally-registered
// MCP clients like Claude Desktop, Claude.ai, ChatGPT, etc.
async function listExternalMcpClientRows(): Promise<Row[]> {
  const result = await betterAuthDb.execute<Row>(sql`
    SELECT id, "clientId", name, "redirectUris", "createdAt", "updatedAt"
    FROM public."oauthClient"
    WHERE COALESCE(disabled, false) = false
      AND "clientId" <> 'cinatra-app-mcp-client'
      AND "clientId" NOT LIKE 'cinatra-llm-%'
      AND COALESCE(name, '') NOT LIKE 'assistant-%'
    ORDER BY "createdAt" DESC NULLS LAST
  `);
  return (result.rows ?? []) as Row[];
}

export async function listClaudeDesktopClients(): Promise<McpOAuthClient[]> {
  const rows = await listExternalMcpClientRows();
  return rows
    .filter((row) => (row.name ?? "").toLowerCase().includes("claude"))
    .map(toClient);
}

export async function countClaudeDesktopClients(): Promise<number> {
  const clients = await listClaudeDesktopClients();
  return clients.length;
}

export async function deleteMcpOAuthClient(clientId: string): Promise<void> {
  await betterAuthDb.execute(sql`
    DELETE FROM public."oauthClient" WHERE "clientId" = ${clientId}
  `);
}
