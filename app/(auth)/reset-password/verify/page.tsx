import { redirect } from "next/navigation";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <ResetPasswordVerify email={email} />
    </div>
  );
}
