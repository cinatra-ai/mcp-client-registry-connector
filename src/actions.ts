"use server";

// Claude Desktop disconnect action lives in the extension. The host route keeps
// a mirror while both setup entry points are supported.

import { revalidatePath } from "next/cache";
import { requireExtensionAction } from "@cinatra-ai/sdk-extensions";
import { deleteMcpOAuthClient } from "./index";

const SYSTEM_CLIENT_IDS = new Set(["cinatra-app-mcp-client"]);

export async function disconnectClaudeDesktopAction(
  formData: FormData,
): Promise<void> {
  await requireExtensionAction("@cinatra-ai/mcp-client-registry-connector", "manage");

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
  revalidatePath("/connectors/cinatra-ai/mcp-client-registry-connector/setup");
  revalidatePath("/connectors");
}
