// Claude Desktop OAuth-client list and management setup page.
// Lives in the extension package alongside the OAuth store helpers.

import "server-only";
import { Main, PageHeader, PageContent } from "@cinatra-ai/sdk-ui/marketplace";
import type { ExtensionHostContext } from "@cinatra-ai/sdk-extensions";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { listClaudeDesktopClients, type McpOAuthClient } from "./index";
import { CopyMcpUrlPanel } from "./copy-mcp-url-panel";
import { disconnectClaudeDesktopAction } from "./actions";

type ConnectorSetupPageProps = {
  packageId: string;
  slug: string;
  searchParams: Record<string, string | string[] | undefined>;
  // Grant-aware host context (dispatch route builds it from requestedHostPorts).
  // The public MCP base URL is read via ctx.mcp — the connector never imports a
  // host MCP internal (mirror-gate: host implements the port, connector consumes).
  ctx: ExtensionHostContext;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function summarizeRedirects(redirectURLs: string[]): string | null {
  const ports = new Set<string>();
  for (const url of redirectURLs) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        ports.add(parsed.port || (parsed.protocol === "https:" ? "443" : "80"));
      }
    } catch {
      // ignore unparseable URI
    }
  }
  if (ports.size === 0) return null;
  return `localhost:${[...ports].join(", ")}`;
}

function ConnectedClientRow({ client }: { client: McpOAuthClient }) {
  const localhostHint = summarizeRedirects(client.redirectURLs);
  const registeredAt = client.createdAt
    ? dateFormatter.format(client.createdAt)
    : null;
  const displayName = client.name?.trim() || "Claude client";

  return (
    <li className="rounded-control border border-line bg-surface px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {client.clientId}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {registeredAt ? <span>Registered {registeredAt}</span> : null}
            {localhostHint ? <span>Callback: {localhostHint}</span> : null}
          </div>
        </div>
        <form action={disconnectClaudeDesktopAction} className="shrink-0">
          <input type="hidden" name="clientId" value={client.clientId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="rounded-control border border-line bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-surface-strong"
          >
            Disconnect
          </Button>
        </form>
      </div>
    </li>
  );
}

export default async function ClaudeConnectorSetupPage(
  { ctx }: ConnectorSetupPageProps,
) {
  // getPublicBaseUrl is optional by ABI contract (added in 2.1.0); call it
  // null-safely and fall through to the "Public URL not configured" panel below
  // when the host predates it or it returns null.
  const { publicBaseUrl } = (await ctx.mcp.getPublicBaseUrl?.()) ?? {
    publicBaseUrl: null,
  };
  const mcpPublicUrl = publicBaseUrl ? `${publicBaseUrl}/api/mcp` : null;
  const connectedClients = await listClaudeDesktopClients();

  return (
    <Main className="min-h-screen">
      <PageHeader
        title="Claude"
        description="Connect Claude Desktop, Claude.ai, or any MCP-compatible client to Cinatra."
        className="max-w-3xl"
      />
      <PageContent className="max-w-3xl flex flex-col gap-6 pb-8">
        {mcpPublicUrl ? (
          <section className="soft-panel rounded-panel p-5 flex flex-col gap-5">
            <div>
              <p className="text-sm font-medium text-foreground">MCP Server URL</p>
              <CopyMcpUrlPanel url={mcpPublicUrl} />
            </div>
            <div className="rounded-control border border-line bg-surface-muted px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                How to connect
              </p>
              <ol className="mt-3 grid gap-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="shrink-0">1.</span>
                  <span>
                    <a
                      href="https://code.claude.com/docs/en/desktop-quickstart"
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      Download and install Claude
                    </a>{" "}
                    for your desktop
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0">2.</span>In Claude, go to Administration →
                  Connectors → Add custom connector
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0">3.</span>Paste the URL above and confirm
                </li>
                <li className="flex gap-2">
                  <span className="shrink-0">4.</span>Click &ldquo;Connect&rdquo; on your
                  Cinatra server
                </li>
              </ol>
            </div>
          </section>
        ) : (
          <section className="soft-panel rounded-panel p-5">
            <Alert variant="warning" className="rounded-control">
              <AlertDescription>
                <p className="font-medium">Public URL not configured</p>
                <p className="mt-1">
                  Set a public base URL in{" "}
                  <a
                    href="/configuration/mcp"
                    className="underline underline-offset-4"
                  >
                    Administration → MCP server
                  </a>{" "}
                  so external clients like Claude can reach Cinatra.
                </p>
              </AlertDescription>
            </Alert>
          </section>
        )}

        <section className="soft-panel rounded-panel p-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-foreground">
              Connected Claude clients
            </p>
            <span className="text-xs text-muted-foreground">
              {connectedClients.length} connected
            </span>
          </div>
          {connectedClients.length > 0 ? (
            <ul className="mt-3 grid gap-3">
              {connectedClients.map((client) => (
                <ConnectedClientRow key={client.clientId} client={client} />
              ))}
            </ul>
          ) : (
            <div className="mt-3 rounded-control border border-dashed border-line bg-surface px-4 py-6 text-sm text-muted-foreground">
              No Claude clients have connected yet. Once a Claude Desktop or
              Claude.ai instance completes the connection flow, it will appear
              here.
            </div>
          )}
        </section>
      </PageContent>
    </Main>
  );
}
