"use client";

import { Crown, Loader2, Mail, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HouseholdMemberInfo } from "@/lib/api/household";
import { formatRemainingTime } from "@/lib/utils/format";
import type { Invitation } from "@/types";

interface MembersTableProps {
  members: HouseholdMemberInfo[];
  invitations: Invitation[];
  currentUserId: string;
  isOwner: boolean;
  onCancelInvitation?: (id: string) => void;
  isCancelling?: boolean;
}

export function MembersTable({
  members,
  invitations,
  currentUserId,
  isOwner,
  onCancelInvitation,
  isCancelling,
}: MembersTableProps) {
  return (
    <div className="space-y-4">
      {members.length > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          {members.map((member) => (
            <article
              key={member.userId}
              className="flex min-h-[76px] items-center gap-3 border-gray-100 border-t px-4 py-4 first:border-t-0"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                {member.role === "owner" ? (
                  <Crown className="size-5 text-amber-500" />
                ) : (
                  <User className="size-5 text-gray-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-gray-900">
                    {member.name || "-"}
                  </p>
                  {member.userId === currentUserId && (
                    <span className="text-primary text-xs">(나)</span>
                  )}
                  <Badge
                    variant={member.role === "owner" ? "default" : "secondary"}
                  >
                    {member.role === "owner" ? "관리자" : "구성원"}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-gray-500 text-sm">
                  {member.email}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {invitations.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 font-medium text-gray-500 text-sm">
            대기 중 초대
          </h3>
          <div className="overflow-hidden rounded-2xl bg-gray-50 shadow-sm ring-1 ring-gray-100">
            {invitations.map((invitation) => (
              <article
                key={invitation.id}
                className="flex min-h-[76px] items-center gap-3 border-gray-100 border-t px-4 py-4 first:border-t-0"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-400">
                  <Mail className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-gray-700">
                      {invitation.email}
                    </p>
                    <Badge variant="outline" className="text-gray-500">
                      대기 중
                    </Badge>
                  </div>
                  <p className="mt-1 text-gray-400 text-xs">
                    {formatRemainingTime(invitation.expires_at)}
                  </p>
                </div>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCancelInvitation?.(invitation.id)}
                    disabled={isCancelling}
                    className="size-9 shrink-0"
                  >
                    {isCancelling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 text-gray-400 hover:text-destructive" />
                    )}
                    <span className="sr-only">초대 취소</span>
                  </Button>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && invitations.length === 0 && (
        <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-gray-100">
          <User className="mx-auto mb-3 size-8 text-gray-300" />
          <p className="font-medium text-gray-700">구성원이 없습니다</p>
        </div>
      )}
    </div>
  );
}
