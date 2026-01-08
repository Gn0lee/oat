import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types";

const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/reset-password",
  "/auth/callback",
  "/auth/invite/callback",
];
const PUBLIC_ROUTES = ["/"];
const LANDING_ROUTE = "/";

const DEFAULT_AUTH_REDIRECT = "/home";
const DEFAULT_UNAUTH_REDIRECT = "/login";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({
            request,
          });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isApiRoute = pathname.startsWith("/api");

  // API 라우트는 미들웨어에서 리다이렉트하지 않음 (각 API에서 처리)
  if (isApiRoute) {
    return supabaseResponse;
  }

  // 인증된 사용자가 auth 라우트 접근 시 홈으로 리다이렉트
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DEFAULT_AUTH_REDIRECT;
    return NextResponse.redirect(redirectUrl);
  }

  // 인증된 사용자가 랜딩페이지 접근 시 홈으로 리다이렉트
  if (user && pathname === LANDING_ROUTE) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DEFAULT_AUTH_REDIRECT;
    return NextResponse.redirect(redirectUrl);
  }

  // 비인증 사용자가 보호된 라우트 접근 시 로그인 페이지로 리다이렉트
  if (!user && !isAuthRoute && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = DEFAULT_UNAUTH_REDIRECT;
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
