import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <AuthShell title="회원가입">
      <SignUpForm />
    </AuthShell>
  );
}
