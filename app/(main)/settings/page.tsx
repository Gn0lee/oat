import { PageContainer, PageHeader } from "@/components/layout";
import { SettingsMenu } from "@/components/settings";

const APP_VERSION = "0.1.0";

export default function SettingsPage() {
  return (
    <PageContainer maxWidth="narrow">
      <PageHeader title="설정" />

      {/* 설정 메뉴 */}
      <SettingsMenu />

      {/* 버전 정보 */}
      <div className="text-center text-sm text-gray-400">
        버전 {APP_VERSION}
      </div>
    </PageContainer>
  );
}
