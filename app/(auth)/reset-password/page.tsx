import { ResetPasswordRequestForm } from "@/components/auth/ResetPasswordRequestForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">oat</h1>
          <p className="mt-2 text-gray-500">가족 자산 통합 관리</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            비밀번호 재설정
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            가입 시 사용한 이메일을 입력해주세요. 비밀번호 재설정 링크를
            보내드립니다.
          </p>
          <ResetPasswordRequestForm />
        </div>
      </div>
    </div>
  );
}
