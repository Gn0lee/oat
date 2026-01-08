"use client";

import { Loader2, Mail, Send, Trash2, UserPlus } from "lucide-react";
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
import {
  useCancelInvitation,
  useInvitations,
  useSendInvitation,
} from "@/hooks/use-invitation";
import { formatRemainingTime } from "@/lib/utils/format";

export function InvitationForm() {
  const [email, setEmail] = useState("");
  const { data: invitations, isLoading, error } = useInvitations();
  const sendMutation = useSendInvitation();
  const cancelMutation = useCancelInvitation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    sendMutation.mutate(email.trim(), {
      onSuccess: () => {
        setEmail("");
      },
    });
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
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
          <div className="h-32 animate-pulse bg-gray-100 rounded-xl" />
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
          파트너의 이메일 주소를 입력하면 초대 메일이 발송됩니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 이메일 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="partner@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sendMutation.isPending}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!email.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              발송
            </Button>
          </div>
          {sendMutation.error && (
            <p className="text-sm text-destructive">
              {sendMutation.error.message}
            </p>
          )}
          {sendMutation.isSuccess && (
            <p className="text-sm text-green-600">
              초대 메일이 발송되었습니다.
            </p>
          )}
        </form>

        {/* 발송된 초대 목록 */}
        {invitations && invitations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">발송된 초대</h4>
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="size-4 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invitation.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRemainingTime(invitation.expires_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancel(invitation.id)}
                    disabled={cancelMutation.isPending}
                    className="shrink-0"
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 text-gray-400 hover:text-destructive" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {invitations && invitations.length === 0 && (
          <p className="text-sm text-center text-gray-500 py-4">
            아직 발송된 초대가 없습니다
          </p>
        )}
      </CardContent>
    </Card>
  );
}
