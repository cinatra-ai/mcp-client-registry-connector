import "server-only";

// This package owns the inbound MCP-client connector. It is not an Anthropic
// API integration; it tracks Claude Desktop / Claude.ai / ChatGPT / any other
// MCP-compatible client that connected TO this Cinatra instance via OAuth.
// Anthropic API connection code lives in @cinatra-ai/anthropic-connector.
//
// Data access goes through the SDK's host-injected MCP OAuth-client store
// (the host binds it to its OAuth-provider storage at boot) — no `@/lib/*`
// host import, so the package stays SDK-only and standalone-extractable.

import {
  listExternalMcpOAuthClients,
  deleteExternalMcpOAuthClient,
  type ExternalMcpOAuthClient,
  type HostRequiredPackageDefinition,
} from "@cinatra-ai/sdk-extensions";

export const mcpClientConnectorPackage: HostRequiredPackageDefinition = {
  packageId: "@cinatra-ai/mcp-client-connector",
  name: "MCP Client",
  slug: "connector-mcp-client",
  description:
    "Inbound MCP-client connector: tracks Claude Desktop / Claude.ai / ChatGPT / any other MCP-compatible client that connected TO this Cinatra instance.",
  settingsHref: "/connectors/cinatra-ai/mcp-client-connector/setup",
};

export type McpOAuthClient = ExternalMcpOAuthClient;

/**
 * Every external MCP client registered with this deployment, newest first.
 * Generic on purpose: no client-name filtering — Claude Desktop, Claude.ai,
 * ChatGPT, and any other MCP-compatible client all list the same way. The
 * host store already excludes Cinatra's own internal OAuth clients.
 */
export async function listExternalMcpClients(): Promise<McpOAuthClient[]> {
  return listExternalMcpOAuthClients();
}

export async function deleteMcpOAuthClient(clientId: string): Promise<void> {
  await deleteExternalMcpOAuthClient(clientId);
}
