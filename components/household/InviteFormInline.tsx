"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InviteFormInlineProps {
  onSubmit: (email: string) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: Error | null;
  isSuccess?: boolean;
}

export function InviteFormInline({
  onSubmit,
  onCancel,
  isPending,
  error,
  isSuccess,
}: InviteFormInlineProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit(email.trim());
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 p-4 bg-gray-50 rounded-lg"
    >
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="초대할 이메일 주소"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={!email.trim() || isPending} size="sm">
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setEmail("");
            onCancel();
          }}
        >
          취소
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {isSuccess && (
        <p className="text-sm text-green-600">초대 메일이 발송되었습니다.</p>
      )}
    </form>
  );
}
