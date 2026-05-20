import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CONSUMER_PREVIEW_COOKIE } from "@/lib/consumer-preview-gate";

const ADMIN_PREVIEW_COOKIE = "admin_preview_gate";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/consumer" || pathname.startsWith("/consumer/")) {
    const hasConsumerPreview =
      request.cookies.get(CONSUMER_PREVIEW_COOKIE)?.value === "1";

    const isPreviewGatePage =
      pathname === "/consumer/preview-gate" ||
      pathname.startsWith("/consumer/preview-gate/");

    if (isPreviewGatePage) {
      if (hasConsumerPreview) {
        const nextParam = request.nextUrl.searchParams.get("next");
        const fallback = "/consumer/summary";
        const destination =
          nextParam?.startsWith("/consumer") &&
          !nextParam.startsWith("/consumer/preview-gate")
            ? nextParam
            : fallback;
        return NextResponse.redirect(new URL(destination, request.url));
      }
      return NextResponse.next();
    }

    if (!hasConsumerPreview) {
      const gateUrl = new URL("/consumer/preview-gate", request.url);
      gateUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(gateUrl);
    }

    return NextResponse.next();
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
  ],
};
