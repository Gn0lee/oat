import { AuthShell } from "@/components/auth/AuthShell";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export default function SetPasswordPage() {
  return (
    <AuthShell
      title="비밀번호 설정"
      description="초대를 수락했습니다. 로그인에 사용할 비밀번호를 설정해주세요."
    >
      <SetPasswordForm />
    </AuthShell>
  );
}
