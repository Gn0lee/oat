import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";

export default function LoginPage() {
  return (
    <AuthShell title="로그인">
      <SignInForm />
    </AuthShell>
  );
}
