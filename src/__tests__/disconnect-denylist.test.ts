// Unit tests for the system-client disconnect denylist enforced by
// disconnectMcpClientAction: SYSTEM_CLIENT_IDS ("cinatra-app-mcp-client") and
// any clientId starting with "cinatra-llm-" must never reach
// deleteMcpOAuthClient, regardless of the extension-action authorization
// outcome. Non-denylisted clientIds must pass through to deletion and
// revalidate both cache paths.

import { describe, it, expect, beforeEach, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  requireExtensionAction: vi.fn(async () => undefined),
  deleteMcpOAuthClient: vi.fn(async () => undefined),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: hoisted.revalidatePath,
}));
vi.mock("@cinatra-ai/sdk-extensions", () => ({
  requireExtensionAction: hoisted.requireExtensionAction,
}));
vi.mock("../index", () => ({
  deleteMcpOAuthClient: hoisted.deleteMcpOAuthClient,
}));

import { disconnectMcpClientAction } from "../actions";

function formDataWith(clientId: string | undefined): FormData {
  const fd = new FormData();
  if (clientId !== undefined) {
    fd.set("clientId", clientId);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireExtensionAction.mockResolvedValue(undefined);
  hoisted.deleteMcpOAuthClient.mockResolvedValue(undefined);
});

describe("disconnectMcpClientAction system-client denylist", () => {
  it("blocks the exact SYSTEM_CLIENT_IDS entry (cinatra-app-mcp-client)", async () => {
    await expect(
      disconnectMcpClientAction(formDataWith("cinatra-app-mcp-client")),
    ).rejects.toThrow(
      "This OAuth client is system-managed and cannot be disconnected here.",
    );

    expect(hoisted.deleteMcpOAuthClient).not.toHaveBeenCalled();
    expect(hoisted.revalidatePath).not.toHaveBeenCalled();
    // The authorization guard still runs before the denylist check.
    expect(hoisted.requireExtensionAction).toHaveBeenCalledWith(
      "@cinatra-ai/mcp-client-connector",
      "manage",
    );
  });

  it("blocks any clientId with the cinatra-llm- prefix", async () => {
    await expect(
      disconnectMcpClientAction(formDataWith("cinatra-llm-openai")),
    ).rejects.toThrow(
      "This OAuth client is system-managed and cannot be disconnected here.",
    );

    expect(hoisted.deleteMcpOAuthClient).not.toHaveBeenCalled();
    expect(hoisted.revalidatePath).not.toHaveBeenCalled();
  });

  it("blocks the bare cinatra-llm- prefix with no suffix", async () => {
    await expect(
      disconnectMcpClientAction(formDataWith("cinatra-llm-")),
    ).rejects.toThrow(
      "This OAuth client is system-managed and cannot be disconnected here.",
    );

    expect(hoisted.deleteMcpOAuthClient).not.toHaveBeenCalled();
    expect(hoisted.revalidatePath).not.toHaveBeenCalled();
  });

  it("does not block a clientId that merely contains cinatra-llm- mid-string", async () => {
    // startsWith() must not turn into a substring match.
    await disconnectMcpClientAction(
      formDataWith("some-cinatra-llm-lookalike"),
    );

    expect(hoisted.deleteMcpOAuthClient).toHaveBeenCalledWith(
      "some-cinatra-llm-lookalike",
    );
    expect(hoisted.revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("allows disconnecting a clientId that is not on the denylist", async () => {
    await disconnectMcpClientAction(formDataWith("claude-desktop-abc123"));

    expect(hoisted.deleteMcpOAuthClient).toHaveBeenCalledTimes(1);
    expect(hoisted.deleteMcpOAuthClient).toHaveBeenCalledWith(
      "claude-desktop-abc123",
    );
    expect(hoisted.revalidatePath).toHaveBeenCalledWith(
      "/connectors/cinatra-ai/mcp-client-connector/setup",
    );
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/connectors");
    expect(hoisted.revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("rejects a missing/empty clientId before the denylist check, without deleting", async () => {
    await expect(disconnectMcpClientAction(formDataWith(undefined))).rejects.toThrow(
      "Missing clientId",
    );
    await expect(disconnectMcpClientAction(formDataWith("   "))).rejects.toThrow(
      "Missing clientId",
    );

    expect(hoisted.deleteMcpOAuthClient).not.toHaveBeenCalled();
    expect(hoisted.revalidatePath).not.toHaveBeenCalled();
  });
});
