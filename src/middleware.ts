import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/administrator")) {
    return NextResponse.next();
  }

  const gateCookie = request.cookies.get(ADMIN_PREVIEW_COOKIE)?.value;
  const hasAccess = gateCookie === "1";

  if (
    pathname === "/administrator/login" ||
    pathname.startsWith("/administrator/login/")
  ) {
    if (hasAccess) {
      const nextParam = request.nextUrl.searchParams.get("next");
      const fallback = "/administrator";
      const destination =
        nextParam?.startsWith("/administrator") &&
        !nextParam.startsWith("/administrator/login")
          ? nextParam
          : fallback;
      return NextResponse.redirect(new URL(destination, request.url));
    }

    return NextResponse.next();
  }

  if (!hasAccess) {
    const loginUrl = new URL("/administrator/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/administrator/:path*"],
};
