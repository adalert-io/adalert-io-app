import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CONSUMER_SHELL_COOKIE } from "@/lib/consumer-shell-preference";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

const CLASSIC_TO_CONSUMER: Record<string, string> = {
  "/summary": "/consumer/summary",
  "/dashboard": "/consumer/dashboard",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasConsumerShell =
    request.cookies.get(CONSUMER_SHELL_COOKIE)?.value === "1";

  // Mark consumer shell before client auth runs (avoids post-auth race to /summary).
  if (pathname === "/consumer" || pathname.startsWith("/consumer/")) {
    const res = NextResponse.next();
    res.cookies.set(CONSUMER_SHELL_COOKIE, "1", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return res;
  }

  // Classic URLs → consumer console when the user already opted into the shell.
  if (hasConsumerShell && pathname in CLASSIC_TO_CONSUMER) {
    return NextResponse.redirect(
      new URL(CLASSIC_TO_CONSUMER[pathname], request.url),
    );
  }

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
  matcher: [
    "/administrator/:path*",
    "/consumer",
    "/consumer/:path*",
    "/summary",
    "/dashboard",
  ],
};
