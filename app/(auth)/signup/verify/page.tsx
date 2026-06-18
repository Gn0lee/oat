import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";

interface VerifyPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { email } = await searchParams;

  if (!email) {
    redirect("/signup");
  }

  return (
    <AuthShell title="이메일 인증" contentClassName="mt-0">
      <EmailVerificationNotice email={email} />
    </AuthShell>
  );
}
