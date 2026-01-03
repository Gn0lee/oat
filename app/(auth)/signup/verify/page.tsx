import { redirect } from "next/navigation";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <EmailVerificationNotice email={email} />
    </div>
  );
}
