import { SettingsMenu } from "@/components/settings";

const APP_VERSION = "0.1.0";

export default function SettingsPage() {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
      </div>

      {/* 설정 메뉴 */}
      <SettingsMenu />

      {/* 버전 정보 */}
      <div className="text-center text-sm text-gray-400">
        버전 {APP_VERSION}
      </div>
    </div>
  );
}
