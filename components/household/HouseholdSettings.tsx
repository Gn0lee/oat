"use client";

import { Check, Pencil, Settings, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUpdateHouseholdName } from "@/hooks/use-household";

interface HouseholdSettingsProps {
  householdId: string;
  householdName: string;
  isOwner: boolean;
}

export function HouseholdSettings({
  householdId,
  householdName,
  isOwner,
}: HouseholdSettingsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(householdName);
  const { mutate: updateName, isPending } = useUpdateHouseholdName();

  const handleSave = () => {
    if (!name.trim()) return;

    updateName(
      { householdId, name: name.trim() },
      {
        onSuccess: () => {
          setIsEditing(false);
          router.refresh();
        },
        onError: (error) => {
          alert(error.message);
        },
      },
    );
  };

  const handleCancel = () => {
    setName(householdName);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="size-5" />
          가구 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">가구 이름</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                id="household-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="가구 이름"
                className="flex-1"
                maxLength={50}
                disabled={isPending}
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSave}
                disabled={isPending || !name.trim()}
              >
                <Check className="size-4 text-green-600" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleCancel}
                disabled={isPending}
              >
                <X className="size-4 text-gray-500" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="font-medium text-gray-900">{householdName}</span>
              {isOwner && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="size-4 text-gray-500" />
                </Button>
              )}
            </div>
          )}
        </div>

        {!isOwner && (
          <p className="text-xs text-gray-400">
            가구 이름은 관리자만 변경할 수 있습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
