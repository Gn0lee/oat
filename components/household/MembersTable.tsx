"use client";

import { Crown, Loader2, Mail, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>이름</TableHead>
          <TableHead>이메일</TableHead>
          <TableHead>상태</TableHead>
          {isOwner && <TableHead className="w-12"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* 구성원 목록 */}
        {members.map((member) => (
          <TableRow key={member.userId}>
            <TableCell>
              <div className="flex items-center justify-center size-8 bg-gray-100 rounded-full">
                {member.role === "owner" ? (
                  <Crown className="size-4 text-amber-500" />
                ) : (
                  <User className="size-4 text-gray-500" />
                )}
              </div>
            </TableCell>
            <TableCell className="font-medium">
              {member.name || "-"}
              {member.userId === currentUserId && (
                <span className="ml-2 text-xs text-primary">(나)</span>
              )}
            </TableCell>
            <TableCell className="text-gray-500">{member.email}</TableCell>
            <TableCell>
              <Badge
                variant={member.role === "owner" ? "default" : "secondary"}
              >
                {member.role === "owner" ? "관리자" : "구성원"}
              </Badge>
            </TableCell>
            {isOwner && <TableCell></TableCell>}
          </TableRow>
        ))}

        {/* 대기 중인 초대 */}
        {invitations.map((invitation) => (
          <TableRow key={invitation.id} className="bg-gray-50/50">
            <TableCell>
              <div className="flex items-center justify-center size-8 bg-gray-100 rounded-full">
                <Mail className="size-4 text-gray-400" />
              </div>
            </TableCell>
            <TableCell className="text-gray-400">-</TableCell>
            <TableCell className="text-gray-500">{invitation.email}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-gray-500">
                대기 중
              </Badge>
              <span className="ml-2 text-xs text-gray-400">
                {formatRemainingTime(invitation.expires_at)}
              </span>
            </TableCell>
            {isOwner && (
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCancelInvitation?.(invitation.id)}
                  disabled={isCancelling}
                  className="size-8"
                >
                  {isCancelling ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4 text-gray-400 hover:text-destructive" />
                  )}
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}

        {/* 빈 상태 */}
        {members.length === 0 && invitations.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={isOwner ? 5 : 4}
              className="text-center text-gray-500 py-8"
            >
              구성원이 없습니다
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
