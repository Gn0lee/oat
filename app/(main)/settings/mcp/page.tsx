import { PageContainer, PageHeader } from "@/components/layout";
import { McpTokenManager } from "@/components/settings";

export default function McpSettingsPage() {
  return (
    <PageContainer maxWidth="medium">
      <PageHeader
        title="MCP 연결"
        subtitle="AI 도구에서 oat 데이터를 읽을 수 있는 연결을 관리합니다."
        backHref="/settings"
      />
      <McpTokenManager />
    </PageContainer>
  );
}
