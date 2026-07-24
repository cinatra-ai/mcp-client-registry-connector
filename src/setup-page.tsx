// MCP-client OAuth-client list and management setup page.
// Lives in the extension package alongside the OAuth store helpers.
//
// connector-setup-tabs (cinatra-ai/mcp-client-registry-connector#39): the page
// wraps its content in the shared `@cinatra-ai/sdk-ui` Tabs primitive — Setup ·
// Connections · Help, with Help always last (design/specs/app-connectors.html
// §II "Multiple connections"). This connector's connection model is INBOUND
// (external MCP clients such as Claude Desktop / Claude.ai / ChatGPT connect
// TO this Cinatra instance, not the other way around), so there is no
// Connect action on the Setup tab — the left column is informational (the MCP
// server URL to hand to a client) and the right "Connections status" card
// mirrors the wordpress-mcp-connector precedent for a connector whose
// registered instances carry no separately-tracked "Disconnected" state: a
// registered OAuth client either exists (connected) or is removed entirely
// (disconnect deletes the row), so the aside shows only a Connected count.

import "server-only";
import type { ExtensionHostContext } from "@cinatra-ai/sdk-extensions";
import { ConnectorSetupPage } from "@cinatra-ai/sdk-ui/connector-setup-page";
import { ConnectorSetupColumns } from "@cinatra-ai/sdk-ui/connector-setup-columns";
import { Tabs, TabsContent, TabsListRow, TabsTrigger } from "@cinatra-ai/sdk-ui/tabs";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";
import { Link } from "./components/ui/link";
import { listExternalMcpClients, type McpOAuthClient } from "./index";
import { CopyMcpUrlPanel } from "./copy-mcp-url-panel";
import { disconnectMcpClientAction } from "./actions";

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
  const displayName = client.name?.trim() || "MCP client";

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
        <form action={disconnectMcpClientAction} className="shrink-0">
          {/* The clientId travels as the submit button's name/value: a form
              submitted via a button includes that button's name/value in the
              payload, so disconnectMcpClientAction still receives clientId
              (identical to the prior hidden <input>) without a raw control
              element. The repo has no shadcn <Input> primitive and a styled
              text field would be wrong for non-visual form state anyway. */}
          <Button
            type="submit"
            name="clientId"
            value={client.clientId}
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

function ConnectedClientsList({ clients }: { clients: McpOAuthClient[] }) {
  return clients.length > 0 ? (
    <ul className="grid gap-3">
      {clients.map((client) => (
        <ConnectedClientRow key={client.clientId} client={client} />
      ))}
    </ul>
  ) : (
    <div className="rounded-control border border-dashed border-line bg-surface px-4 py-6 text-sm text-muted-foreground">
      No external MCP clients have connected yet. Once a client such as
      Claude Desktop, Claude.ai, or ChatGPT completes the connection flow, it
      will appear here.
    </div>
  );
}

export default async function McpClientConnectorSetupPage(
  { ctx }: ConnectorSetupPageProps,
) {
  // getPublicBaseUrl is optional by ABI contract (added in 2.1.0); call it
  // null-safely and fall through to the "Public URL not configured" panel below
  // when the host predates it or it returns null.
  const { publicBaseUrl } = (await ctx.mcp.getPublicBaseUrl?.()) ?? {
    publicBaseUrl: null,
  };
  const mcpPublicUrl = publicBaseUrl ? `${publicBaseUrl}/api/mcp` : null;
  const connectedClients = await listExternalMcpClients();

  return (
    // Standard connector-setup PAGE chrome — header + content in the SAME Wide
    // column. `divider={false}` — the section rule is the tab row's etched
    // rule (per §II tabbed setup pages).
    <ConnectorSetupPage
      title="MCP Client"
      description="Connect Claude Desktop, Claude.ai, ChatGPT, or any other MCP-compatible client to Cinatra."
      divider={false}
      className="flex flex-col gap-6 pb-8"
    >
      <Tabs defaultValue="setup" className="w-full">
        <TabsListRow aria-label="MCP Client connector setup">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          {/* Help is RESERVED and ALWAYS LAST (§II). */}
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsListRow>

        {/* SETUP — the multi-connection two-column body. This connector holds
            MANY inbound client connections (Claude Desktop, Claude.ai,
            ChatGPT, …), so per §II "Multiple connections" the connection
            state lives in the Setup tab's "Connections status" card + the
            Connections tab, not a single-connection header badge. The left
            column is informational (no Connect action here — clients
            initiate the connection, this instance does not). */}
        <TabsContent value="setup" forceMount className="mt-6 data-[state=inactive]:hidden">
          <ConnectorSetupColumns
            conformanceId="connector-multi-setup"
            state="ready"
            fields={
              mcpPublicUrl ? (
                <section className="soft-panel rounded-panel p-5">
                  <p className="text-sm font-medium text-foreground">MCP Server URL</p>
                  <CopyMcpUrlPanel url={mcpPublicUrl} />
                </section>
              ) : (
                <section className="soft-panel rounded-panel p-5">
                  <Alert variant="warning" className="rounded-control">
                    <AlertDescription>
                      <p className="font-medium">Public URL not configured</p>
                      <p className="mt-1">
                        Set a public base URL in{" "}
                        <Button
                          asChild
                          variant="link"
                          className="h-auto p-0 align-baseline text-sm font-normal underline underline-offset-4 hover:no-underline"
                        >
                          <Link href="/configuration/mcp">
                            Administration → MCP server
                          </Link>
                        </Button>{" "}
                        so external MCP clients can reach Cinatra.
                      </p>
                    </AlertDescription>
                  </Alert>
                </section>
              )
            }
            aside={
              // Connections status card (§II "Multiple connections"): ONE
              // count badge per status in play. A registered OAuth client has
              // no separately-tracked "Disconnected" state — disconnecting
              // deletes the row — so only "Connected" ever applies (mirrors
              // the wordpress-mcp-connector precedent), no Check action.
              <div className="soft-panel rounded-panel px-4 py-4">
                <p className="border-b border-line pb-2.5 text-[13px] font-semibold text-foreground">
                  Connections status
                </p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {connectedClients.length > 0 ? (
                    <span className="inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent bg-success/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-success">
                      {connectedClients.length} Connected
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No connections yet.</span>
                  )}
                </div>
                <p className="mt-3.5 text-xs text-muted-foreground">
                  See the <span className="font-medium text-foreground">Connections</span> tab for
                  the full list.
                </p>
              </div>
            }
          />
        </TabsContent>

        {/* CONNECTIONS — every connected client stacked as its own card (§II
            "Multiple connections" · Connections tab). This is the structural
            multi-connection tab (not a custom configuration tab), so it stays
            at the Wide column like Setup — the Narrow width is for Help and
            other custom config tabs. */}
        <TabsContent value="connections" forceMount className="mt-6 w-full data-[state=inactive]:hidden">
          <section className="soft-panel rounded-panel p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Connected clients</p>
              <span className="text-xs text-muted-foreground">
                {connectedClients.length} connected
              </span>
            </div>
            <div className="mt-3">
              <ConnectedClientsList clients={connectedClients} />
            </div>
          </section>
        </TabsContent>

        {/* HELP — reserved, always LAST, read-only (no form, no Save). Narrow
            (576px), flush-left beneath the tabs. Carries the setup how-to that
            previously lived inline in the Setup tab. */}
        <TabsContent
          value="help"
          forceMount
          className="mt-6 flex max-w-xl flex-col gap-5 data-[state=inactive]:hidden"
        >
          <div className="rounded-control border border-line bg-surface-muted px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              How to connect (Claude shown as an example)
            </p>
            <ol className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="shrink-0">1.</span>
                <span>
                  <Button
                    asChild
                    variant="link"
                    className="h-auto p-0 align-baseline text-sm font-normal text-muted-foreground underline underline-offset-4 hover:text-foreground hover:no-underline"
                  >
                    <Link href="https://code.claude.com/docs/en/desktop-quickstart">
                      Download and install Claude
                    </Link>
                  </Button>{" "}
                  for your desktop
                </span>
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">2.</span>In your MCP client, go to
                Administration → Connectors → Add custom connector
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">3.</span>Paste the URL from the Setup tab and confirm
              </li>
              <li className="flex gap-2">
                <span className="shrink-0">4.</span>Cinatra opens its sign-in and
                consent screen — sign in, then click &ldquo;Authorize
                access&rdquo; to complete the connection
              </li>
            </ol>
          </div>
        </TabsContent>
      </Tabs>
    </ConnectorSetupPage>
  );
}
