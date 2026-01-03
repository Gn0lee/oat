"use client";

import { Loader2, UserPlus2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAcceptInvitation } from "@/hooks/use-invitation";

export function AcceptInvitation() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const acceptMutation = useAcceptInvitation();

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 입력값 정규화: 대문자, 숫자만 허용, 최대 7자 (하이픈 포함)
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "");

    // 3자리 입력 후 자동 하이픈 추가
    if (value.length === 3 && !value.includes("-")) {
      value = `${value}-`;
    }

    // 최대 7자 (ABC-123)
    if (value.length <= 7) {
      setCode(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (code.replace("-", "").length !== 6) {
      return;
    }

    acceptMutation.mutate(code, {
      onSuccess: () => {
        // 성공 시 대시보드로 이동 (새로고침하여 가구 정보 갱신)
        router.refresh();
      },
    });
  };

  const isValidCode = code.replace("-", "").length === 6;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus2 className="size-5" />
          초대 코드 입력
        </CardTitle>
        <CardDescription>
          파트너에게 받은 초대 코드를 입력하세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invitation-code">초대 코드</Label>
            <Input
              id="invitation-code"
              type="text"
              placeholder="ABC-123"
              value={code}
              onChange={handleCodeChange}
              className="text-center text-xl tracking-wider font-mono"
              disabled={acceptMutation.isPending}
            />
          </div>

          {acceptMutation.error && (
            <p className="text-sm text-center text-destructive">
              {acceptMutation.error.message}
            </p>
          )}

          {acceptMutation.isSuccess && (
            <p className="text-sm text-center text-green-600">
              가구에 성공적으로 합류했습니다!
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!isValidCode || acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                처리 중...
              </>
            ) : (
              "초대 수락"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
