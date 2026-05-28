import { PageContainer } from "@/components/layout";
import { McpTokenManager } from "@/components/settings";

export default function McpSettingsPage() {
  return (
    <PageContainer maxWidth="medium">
      <McpTokenManager />
    </PageContainer>
  );
}
