"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface EmailVerificationNoticeProps {
  email: string;
}

export function EmailVerificationNotice({
  email,
}: EmailVerificationNoticeProps) {
  return (
    <Card className="w-full max-w-md border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-8 w-8 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <CardTitle className="text-xl">이메일을 확인해주세요</CardTitle>
        <CardDescription className="text-base mt-2">
          <span className="font-medium text-gray-900">{email}</span>
          <br />
          으로 인증 메일을 보냈습니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500 text-center">
          메일함을 확인하고 인증 링크를 클릭해주세요.
          <br />
          메일이 오지 않았다면 스팸함을 확인해주세요.
        </p>
        <Button asChild variant="outline" className="w-full h-12 rounded-xl">
          <Link href="/login">로그인 페이지로</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
