"use client";

import { Bell, Bot, LogOut, Monitor, Shield, User, Users } from "lucide-react";
import { useTransition } from "react";
import { signOutAction } from "@/app/(auth)/logout/actions";
import { SettingsMenuItem } from "./SettingsMenuItem";

export function SettingsMenu() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <div className="space-y-4">
      <SettingsMenuItem
        icon={User}
        label="프로필"
        description="이름, 이메일 관리"
        href="/settings/profile"
        disabled
      />

      <SettingsMenuItem
        icon={Users}
        label="가구 관리"
        description="가구 이름, 구성원, 초대 관리"
        href="/settings/household"
      />

      <SettingsMenuItem
        icon={Shield}
        label="계정 보안"
        description="비밀번호 변경"
        href="/settings/security"
        disabled
      />

      <SettingsMenuItem
        icon={Bot}
        label="MCP 연결"
        description="AI 도구 연결 토큰 관리"
        href="/settings/mcp"
      />

      <SettingsMenuItem
        icon={Bell}
        label="알림 설정"
        description="앱 알림, Push 수신 여부 관리"
        href="/settings/notifications"
      />

      <SettingsMenuItem
        icon={Monitor}
        label="화면 설정"
        href="/settings/theme"
        disabled
      />

      <SettingsMenuItem
        icon={LogOut}
        label="로그아웃"
        onClick={handleLogout}
        isLoading={isPending}
      />
    </div>
  );
}
