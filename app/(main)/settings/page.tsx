import { PageContainer } from "@/components/layout";
import { SettingsMenu } from "@/components/settings";
import { isMcpEnabled } from "@/lib/mcp/feature-flags";

const APP_VERSION = "0.1.0";

export default function SettingsPage() {
  const mcpEnabled = isMcpEnabled();
  return (
    <PageContainer maxWidth="narrow">
      {/* 설정 메뉴 */}
      <SettingsMenu mcpEnabled={mcpEnabled} />

      {/* 버전 정보 */}
      <div className="text-center text-sm text-gray-400">
        버전 {APP_VERSION}
      </div>
    </PageContainer>
  );
}
