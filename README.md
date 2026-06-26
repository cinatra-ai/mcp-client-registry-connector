# MCP Clients

See every external MCP client that has signed in to your Cinatra workspace and manage their access. Cinatra exposes its agents over the Model Context Protocol, so tools like Claude Desktop, Claude.ai, and ChatGPT can call your agents — this page is where you confirm who is connected and disconnect anyone who should not be.

To connect a new client, copy the MCP server URL shown in Administration → Connectors → MCP Client and paste it into your client's connector settings. Your Cinatra instance must have a public base URL configured (Administration → MCP server) before external clients can reach it; if that URL is missing, the setup page shows a warning with a direct link to the configuration screen.

When a client completes the OAuth flow it appears in the Connected clients list with its registration date and, for desktop clients, the localhost callback port. To revoke access, click Disconnect next to the client entry. System-managed OAuth clients (used internally by Cinatra) cannot be disconnected from this page.

The connector ships as a React server component package (`@cinatra-ai/mcp-client-connector`) and has no configuration of its own beyond the public base URL set in Administration. For local development, run the host application and navigate to `/connectors/cinatra-ai/mcp-client-connector/setup`. The package peer-depends on `@cinatra-ai/sdk-extensions` and `@cinatra-ai/sdk-ui` and is installed automatically when the host activates this connector.

If the MCP server URL panel shows a warning instead of a URL, set the public base URL in Administration → MCP server and reload. If a client that completed the connection flow does not appear in the list, verify that the OAuth redirect completed without error in the client application.

## Works with

- Claude Desktop
- Claude.ai
- ChatGPT
- Custom MCP clients

## Capabilities

- See every MCP client that has signed in to your workspace
- Copy the Cinatra MCP server URL into a new client's configuration
- Disconnect a client to revoke its access
