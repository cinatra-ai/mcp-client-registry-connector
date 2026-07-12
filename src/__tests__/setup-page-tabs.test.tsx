// @vitest-environment jsdom
/**
 * connector-setup-tabs (mcp-client-registry-connector#39): the setup page
 * wraps its content in the shared `@cinatra-ai/sdk-ui/tabs` primitive —
 * Setup · Connections · Help, with Help always last
 * (design/specs/app-connectors.html §II "Multiple connections" — this
 * connector holds many INBOUND client connections, one per registered MCP
 * OAuth client).
 *
 * Renders the REAL async server component (`McpClientConnectorSetupPage`)
 * through the REAL `@cinatra-ai/sdk-ui` Tabs primitive (not mocked) — only
 * the connector's own host-bound data reads (`listExternalMcpClients`) and
 * its server action (`disconnectMcpClientAction`) are stubbed. Mirrors the
 * `wordpress-mcp-connector` settings-page-tabs.test.tsx render pattern: raw
 * `react-dom/client` + `act`, no testing-library dependency added.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtensionHostContext } from "@cinatra-ai/sdk-extensions";
import type { McpOAuthClient } from "../index";

const { listExternalMcpClients } = vi.hoisted(() => ({
  listExternalMcpClients: vi.fn(),
}));

vi.mock("../index", () => ({
  listExternalMcpClients,
}));

vi.mock("../actions", () => ({
  disconnectMcpClientAction: vi.fn(),
}));

import McpClientConnectorSetupPage from "../setup-page";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const mountedRoots: Root[] = [];

// Radix Tabs activates on `mousedown` (+ `onFocus` in the default "automatic"
// activation mode), not a bare synthetic `click` — mirrors the native pointer
// pipeline a real browser click produces.
function clickTab(el: HTMLElement) {
  el.dispatchEvent(
    new window.MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }),
  );
  el.click();
}

function fakeCtx(publicBaseUrl: string | null = "https://cinatra.example.com") {
  return {
    mcp: {
      getPublicBaseUrl: async () => ({ publicBaseUrl }),
    },
  } as unknown as ExtensionHostContext;
}

function oneClient(): McpOAuthClient[] {
  return [
    {
      clientId: "mcp-client-abc123",
      name: "Claude Desktop",
      redirectURLs: ["http://localhost:33418/callback"],
      createdAt: new Date("2026-06-01T12:00:00Z"),
    } as McpOAuthClient,
  ];
}

async function renderSetupPage(
  container: HTMLDivElement,
  ctx: ExtensionHostContext = fakeCtx(),
) {
  const element = await McpClientConnectorSetupPage({
    packageId: "@cinatra-ai/mcp-client-connector",
    slug: "connector-mcp-client",
    searchParams: {},
    ctx,
  });
  const root = createRoot(container);
  mountedRoots.push(root);
  await act(async () => {
    root.render(element);
  });
  return root;
}

beforeEach(() => {
  vi.clearAllMocks();
  listExternalMcpClients.mockResolvedValue(oneClient());
});

afterEach(() => {
  for (const root of mountedRoots.splice(0)) {
    act(() => {
      root.unmount();
    });
  }
  document.body.innerHTML = "";
});

describe("McpClientConnectorSetupPage — connector-setup-tabs (#39)", () => {
  it("renders exactly Setup, Connections, Help — in that order, Help last", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderSetupPage(container);

    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(tabs.map((t) => t.textContent)).toEqual([
      "Setup",
      "Connections",
      "Help",
    ]);
  });

  it("uses the shared design-system tablist (role=tablist with an aria-label) — no hand-rolled tab chrome", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderSetupPage(container);

    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
    expect(tablist!.getAttribute("aria-label")).toBe(
      "MCP Client connector setup",
    );
  });

  it("maps each tab to its own content: Setup → URL + status, Connections → the client list, Help → read-only how-to", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderSetupPage(container);

    const tabs = Array.from(container.querySelectorAll('[role="tab"]'));
    const panels = Array.from(container.querySelectorAll('[role="tabpanel"]'));
    expect(panels).toHaveLength(3);

    // Radix wires each trigger's `aria-controls` to its panel's `id` — assert
    // the content-mapping contract structurally, not by DOM order.
    for (const tab of tabs) {
      const controlsId = tab.getAttribute("aria-controls");
      const panel = panels.find((p) => p.id === controlsId);
      expect(panel, `no panel found for tab "${tab.textContent}"`).toBeTruthy();
    }

    const setupTab = tabs.find((t) => t.textContent === "Setup")!;
    const connectionsTab = tabs.find((t) => t.textContent === "Connections")!;
    const helpTab = tabs.find((t) => t.textContent === "Help")!;

    const setupPanel = panels.find(
      (p) => p.id === setupTab.getAttribute("aria-controls"),
    )!;
    const connectionsPanel = panels.find(
      (p) => p.id === connectionsTab.getAttribute("aria-controls"),
    )!;
    const helpPanel = panels.find(
      (p) => p.id === helpTab.getAttribute("aria-controls"),
    )!;

    expect(setupPanel.textContent).toContain("MCP Server URL");
    expect(setupPanel.textContent).toContain("https://cinatra.example.com/api/mcp");
    expect(setupPanel.textContent).toContain("Connections status");
    expect(setupPanel.textContent).toContain("1 Connected");
    expect(setupPanel.textContent).not.toContain("How to connect");

    expect(connectionsPanel.textContent).toContain("Claude Desktop");
    expect(connectionsPanel.textContent).toContain("mcp-client-abc123");
    expect(connectionsPanel.textContent).not.toContain("How to connect");

    expect(helpPanel.textContent).toContain("How to connect");
    expect(helpPanel.textContent).toContain(
      "In your MCP client, go to Administration",
    );
    // Help is read-only — no form action in its content (its only clickable
    // affordance is a real <a> navigation link, not a submit button).
    expect(helpPanel.querySelector("form")).toBeNull();
    expect(helpPanel.querySelector("button")).toBeNull();
  });

  it("Setup tab shows the 'Public URL not configured' warning when the host has no public base URL", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderSetupPage(container, fakeCtx(null));

    const setupTab = Array.from(container.querySelectorAll('[role="tab"]')).find(
      (t) => t.textContent === "Setup",
    )!;
    const setupPanel = container.querySelector(
      `#${setupTab.getAttribute("aria-controls")}`,
    )!;
    expect(setupPanel.textContent).toContain("Public URL not configured");
    expect(setupPanel.textContent).not.toContain("MCP Server URL");
  });

  it("a11y: Setup is selected by default; clicking a tab flips the selected + visible state (no page reload)", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderSetupPage(container);

    const tabs = () => Array.from(container.querySelectorAll('[role="tab"]'));
    const setupTab = () => tabs().find((t) => t.textContent === "Setup")!;
    const connectionsTab = () =>
      tabs().find((t) => t.textContent === "Connections")!;

    expect(setupTab().getAttribute("aria-selected")).toBe("true");
    expect(connectionsTab().getAttribute("aria-selected")).toBe("false");

    await act(async () => {
      clickTab(connectionsTab() as HTMLElement);
    });

    expect(connectionsTab().getAttribute("aria-selected")).toBe("true");
    expect(setupTab().getAttribute("aria-selected")).toBe("false");

    const connectionsPanel = container.querySelector(
      `#${connectionsTab().getAttribute("aria-controls")}`,
    )!;
    expect(connectionsPanel.getAttribute("data-state")).toBe("active");
  });

  it("a11y: keyboard roving-tabindex — ArrowRight from Setup moves focus + selection to Connections", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderSetupPage(container);

    const tabs = () => Array.from(container.querySelectorAll('[role="tab"]'));
    const setupTab = () => tabs().find((t) => t.textContent === "Setup")! as HTMLElement;
    const connectionsTab = () =>
      tabs().find((t) => t.textContent === "Connections")! as HTMLElement;

    setupTab().focus();
    expect(document.activeElement).toBe(setupTab());

    await act(async () => {
      setupTab().dispatchEvent(
        new window.KeyboardEvent("keydown", {
          key: "ArrowRight",
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    // Radix's roving-focus + automatic-activation-on-focus updates can land on
    // a macrotask (not just a microtask) after the keydown dispatch resolves —
    // under CPU contention (e.g. this file running alongside sibling test
    // files) a bare `await Promise.resolve()` can observe the DOM before that
    // task flushes. Poll with real macrotask ticks instead of a single microtask.
    for (
      let attempt = 0;
      attempt < 10 && document.activeElement !== connectionsTab();
      attempt++
    ) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    expect(document.activeElement).toBe(connectionsTab());
    expect(connectionsTab().getAttribute("aria-selected")).toBe("true");
  });

  it("empty state: renders 'No external MCP clients have connected yet' / 'No connections yet' with no client rows", async () => {
    listExternalMcpClients.mockResolvedValue([]);
    const container = document.createElement("div");
    document.body.appendChild(container);
    await renderSetupPage(container);

    expect(container.textContent).toContain(
      "No external MCP clients have connected yet.",
    );
    expect(container.textContent).toContain("No connections yet.");
  });
});
