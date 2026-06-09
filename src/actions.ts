"use server";

// MCP-client disconnect action lives in the extension, gated by the
// per-install extension access policy via the SDK action guard.

import { revalidatePath } from "next/cache";
import { requireExtensionAction } from "@cinatra-ai/sdk-extensions";
import { deleteMcpOAuthClient } from "./index";

const SYSTEM_CLIENT_IDS = new Set(["cinatra-app-mcp-client"]);

export async function disconnectMcpClientAction(
  formData: FormData,
): Promise<void> {
  await requireExtensionAction("@cinatra-ai/mcp-client-connector", "manage");

  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!clientId) {
    throw new Error("Missing clientId");
  }
  if (SYSTEM_CLIENT_IDS.has(clientId) || clientId.startsWith("cinatra-llm-")) {
    throw new Error(
      "This OAuth client is system-managed and cannot be disconnected here.",
    );
  }

  await deleteMcpOAuthClient(clientId);
  revalidatePath("/connectors/cinatra-ai/mcp-client-connector/setup");
  revalidatePath("/connectors");
}
