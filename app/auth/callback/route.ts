import { type NextRequest, NextResponse } from "next/server";

/**
 * 이메일 링크 callback (deprecated)
 * OTP 인증 방식으로 전환되어 더 이상 사용되지 않습니다.
 * 이메일 링크 클릭 시 로그인 페이지로 안내합니다.
 */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;

  // OTP 방식으로 전환되어 이메일 링크는 더 이상 사용하지 않음
  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent("이메일 인증 코드를 입력해주세요")}`,
  );
}
