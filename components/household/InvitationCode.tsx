"use client";

import { Check, Copy, RefreshCw, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreateInvitation, useInvitation } from "@/hooks/use-invitation";
import { formatInvitationCode, formatRemainingTime } from "@/lib/utils/format";

export function InvitationCode() {
  const [copied, setCopied] = useState(false);
  const { data: invitation, isLoading, error } = useInvitation();
  const createMutation = useCreateInvitation();

  const handleCreateCode = () => {
    createMutation.mutate();
  };

  const handleCopyCode = async () => {
    if (!invitation) return;

    try {
      await navigator.clipboard.writeText(invitation.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 복사 실패 시 무시
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            파트너 초대
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse bg-gray-100 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            파트너 초대
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="size-5" />
          파트너 초대
        </CardTitle>
        <CardDescription>
          초대 코드를 공유하여 파트너를 가구에 추가하세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitation ? (
          <>
            <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-xl">
              <span className="text-3xl font-bold tracking-wider text-gray-900">
                {formatInvitationCode(invitation.code)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="size-5 text-green-600" />
                ) : (
                  <Copy className="size-5" />
                )}
              </Button>
            </div>
            <p className="text-center text-sm text-gray-500">
              {formatRemainingTime(invitation.expires_at)}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCreateCode}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              새 코드 생성
            </Button>
          </>
        ) : (
          <>
            <p className="text-center text-sm text-gray-500">
              초대 코드가 없습니다
            </p>
            <Button
              className="w-full"
              onClick={handleCreateCode}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <UserPlus className="size-4" />
              )}
              초대 코드 생성
            </Button>
          </>
        )}
        {createMutation.error && (
          <p className="text-sm text-center text-destructive">
            {createMutation.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
