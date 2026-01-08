"use client";

import { User, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MAX_HOUSEHOLD_MEMBERS } from "@/constants/household";
import {
  useCancelInvitation,
  useInvitations,
  useSendInvitation,
} from "@/hooks/use-invitation";
import type { HouseholdMemberInfo } from "@/lib/api/household";
import { InviteFormInline } from "./InviteFormInline";
import { MembersTable } from "./MembersTable";

interface HouseholdMembersCardProps {
  members: HouseholdMemberInfo[];
  currentUserId: string;
  isOwner: boolean;
}

export function HouseholdMembersCard({
  members,
  currentUserId,
  isOwner,
}: HouseholdMembersCardProps) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const { data: invitations, isLoading: isLoadingInvitations } =
    useInvitations();
  const sendMutation = useSendInvitation();
  const cancelMutation = useCancelInvitation();

  const canInvite = isOwner && members.length < MAX_HOUSEHOLD_MEMBERS;
  const pendingInvitations = invitations ?? [];

  const handleSendInvite = (email: string) => {
    sendMutation.mutate(email, {
      onSuccess: () => {
        setShowInviteForm(false);
      },
    });
  };

  const handleCancelForm = () => {
    setShowInviteForm(false);
    sendMutation.reset();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="size-5" />
              구성원
            </CardTitle>
            <CardDescription>
              {members.length}명 / 최대 {MAX_HOUSEHOLD_MEMBERS}명
              {pendingInvitations.length > 0 &&
                ` (대기 중 ${pendingInvitations.length}명)`}
            </CardDescription>
          </div>
          {canInvite && !showInviteForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteForm(true)}
            >
              <UserPlus className="size-4 mr-2" />
              초대
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInviteForm && (
          <InviteFormInline
            onSubmit={handleSendInvite}
            onCancel={handleCancelForm}
            isPending={sendMutation.isPending}
            error={sendMutation.error}
            isSuccess={sendMutation.isSuccess}
          />
        )}

        <MembersTable
          members={members}
          invitations={isLoadingInvitations ? [] : pendingInvitations}
          currentUserId={currentUserId}
          isOwner={isOwner}
          onCancelInvitation={(id) => cancelMutation.mutate(id)}
          isCancelling={cancelMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}
