import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordRequestForm } from "@/components/auth/ResetPasswordRequestForm";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="비밀번호 재설정"
      description="가입 시 사용한 이메일을 입력해주세요. 비밀번호 재설정 링크를 보내드립니다."
    >
      <ResetPasswordRequestForm />
    </AuthShell>
  );
}
