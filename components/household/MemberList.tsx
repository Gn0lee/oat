"use client";

import { Crown, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HouseholdMemberInfo } from "@/lib/api/household";

interface MemberListProps {
  members: HouseholdMemberInfo[];
  currentUserId: string;
}

export function MemberList({ members, currentUserId }: MemberListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-5" />
          구성원 ({members.length}명)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-10 bg-gray-200 rounded-full">
                  {member.role === "owner" ? (
                    <Crown className="size-5 text-amber-500" />
                  ) : (
                    <User className="size-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {member.name}
                    {member.userId === currentUserId && (
                      <span className="ml-2 text-xs text-primary">(나)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  member.role === "owner"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {member.role === "owner" ? "관리자" : "구성원"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
