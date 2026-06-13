import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { McpTokenManager } from "@/components/settings";
import { isMcpEnabled } from "@/lib/mcp/feature-flags";

export default function McpSettingsPage() {
  if (!isMcpEnabled()) {
    redirect("/settings");
  }

  return (
    <PageContainer maxWidth="medium">
      <McpTokenManager />
    </PageContainer>
  );
}
