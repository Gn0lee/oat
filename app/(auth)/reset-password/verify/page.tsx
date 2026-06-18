import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordVerify } from "@/components/auth/ResetPasswordVerify";

interface VerifyPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { email } = await searchParams;

  if (!email) {
    redirect("/reset-password");
  }

  return (
    <AuthShell title="비밀번호 재설정" contentClassName="mt-0">
      <ResetPasswordVerify email={email} />
    </AuthShell>
  );
}
