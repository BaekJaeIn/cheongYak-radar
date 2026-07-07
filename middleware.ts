// C37 AuthGuard — 전체 잠금 (v6 FR-13.3, BR-U8-1).
// 예외: /login, PWA 자산(manifest·sw.js·아이콘 등 정적 파일). API는 자체 401 (BR-U8-11).
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// 확장자 있는 요청은 정적 자산으로 간주(sw.js·manifest.json·아이콘 — 잠그면 PWA 설치·푸시 파손)
const PUBLIC_FILE = /\.[a-zA-Z0-9]+$/;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api") || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  // 세션 확인 + 쿠키 갱신(@supabase/ssr 권장 패턴)
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && pathname !== "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  // _next 내부 자산 제외 — 나머지는 미들웨어에서 판단
  matcher: ["/((?!_next/static|_next/image).*)"],
};
